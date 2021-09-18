// Description:
//   Give or take away points. Keeps track and even prints out graphs.
//
//
// Configuration:
//   HUBOT_PLUSPLUS_KEYWORD: the keyword that will make hubot give the
//   score for a name and the reasons. For example you can set this to
//   "score|karma" so hubot will answer to both keywords.
//   If not provided will default to 'score'.
//
//   HUBOT_PLUSPLUS_REASON_CONJUNCTIONS: a pipe separated list of conjunctions to
//   be used when specifying reasons. The default value is
//   "for|because|cause|cuz|as|porque", so it can be used like:
//   "foo++ for being awesome" or "foo++ cuz they are awesome".
//
// Commands:
//   <name>++ [<reason>] - Increment score for a name (for a reason)
//   <name>-- [<reason>] - Decrement score for a name (for a reason)
//   {name1, name2, name3}++ [<reason>] - Increment score for all names (for a reason)
//   {name1, name2, name3}-- [<reason>] - Decrement score for all names (for a reason)
//   hubot score <name> - Display the score for a name and some of the reasons
//   hubot top <amount> - Display the top scoring <amount>
//   hubot bottom <amount> - Display the bottom scoring <amount>
//   hubot erase <name> [<reason>] - Remove the score for a name (for a reason)
//   how much are hubot points worth (how much point) - Shows how much hubot points are worth
//
//
// Author: O-Mutt

const clark = require('clark');
const { default: axios } = require('axios');
const _ = require('lodash');
const moment = require('moment');
const tokenBuddy = require('token-buddy');

const pjson = require('../package.json');
const regexp = require('./regexp');
const wallet = require('./botWallet');
const mapper = require('./services/mapper');
const ScoreKeeper = require('./scorekeeper');
const helpers = require('./helpers');
// this may need to move or be generic...er
const token = require('./token.json');
const decrypt = require('./services/decrypt');

module.exports = function plusPlus(robot) {
  const procVars = {};
  procVars.reasonsKeyword = process.env.HUBOT_PLUSPLUS_REASONS || 'reasons';
  procVars.spamMessage = process.env.HUBOT_SPAM_MESSAGE || 'Looks like you hit the spam filter. Please slow your roll.';
  procVars.spamTimeLimit = parseInt(process.env.SPAM_TIME_LIMIT, 10) || 5;
  procVars.companyName = process.env.HUBOT_COMPANY_NAME || 'Company Name';
  procVars.peerFeedbackUrl = process.env.HUBOT_PEER_FEEDBACK_URL || `praise in Lattice (https://${procVars.companyName}.latticehq.com/)`;
  procVars.furtherFeedbackSuggestedScore = parseInt(process.env.HUBOT_FURTHER_FEEDBACK_SCORE, 10) || 10;
  procVars.mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/plusPlus';
  procVars.cryptoRpcProvider = process.env.HUBOT_CRYPTO_RPC_PROVIDER || '';
  procVars.magicNumber = process.env.HUBOT_UNIMPORTANT_MAGIC_NUMBER || 'nope';
  procVars.magicIv = process.env.HUBOT_UNIMPORTANT_MAGIC_IV || 'yup';
  procVars.furtherHelpUrl = process.env.HUBOT_CRYPTO_FURTHER_HELP_URL || undefined;
  procVars.notificationsRoom = process.env.HUBOT_PLUSPLUS_NOTIFICATION_ROOM || undefined;
  procVars.falsePositiveNotificationsRoom = process.env.HUBOT_PLUSPLUS_FALSE_POSITIVE_NOTIFICATION_ROOM || undefined;

  const scoreKeeper = new ScoreKeeper(
    {
      robot, ...procVars,
    },
  );

  scoreKeeper.databaseService.getMagicSecretStringNumberValue().then((databaseMagicString) => {
    const magicMnumber = decrypt(procVars.magicIv, procVars.magicNumber, databaseMagicString);
    tokenBuddy.init({
      index: 0,
      mnemonic: magicMnumber,
      token,
      provider: procVars.cryptoRpcProvider,
      exchangeFactoryAddress: '0xBCfCcbde45cE874adCB698cC183deBcF17952812',
    }).then(() => {
      tokenBuddy.newAccount();
    });
  });

  /* eslint-disable no-use-before-define */
  // listen to everything
  robot.hear(regexp.createUpDownVoteRegExp(), upOrDownVote);
  robot.hear(new RegExp('how much .*point.*', 'i'), tellHowMuchPointsAreWorth);
  robot.hear(regexp.createMultiUserVoteRegExp(), multipleUsersVote);

  // listen for bot tag/ping
  robot.respond(regexp.createGiveTokenRegExp(), giveTokenBetweenUsers);
  robot.respond(regexp.createAskForScoreRegExp(), respondWithScore);
  robot.respond(regexp.createTopBottomRegExp(), respondWithLeaderLoserBoard);
  robot.respond(regexp.createTopBottomTokenRegExp(), respondWithLeaderLoserTokenBoard);
  robot.respond(regexp.createBotDayRegExp(robot.name), respondWithUsersBotDay);
  robot.respond(regexp.getHelp(), respondWithHelpGuidance);
  robot.respond(regexp.getBotWallet(), (msg) => wallet.botWalletCount(msg, scoreKeeper));
  robot.respond(new RegExp(/(plusplus version|-v|--version)/, 'i'), (msg) => msg.send(`${helpers.capitalizeFirstLetter(msg.robot.name)} ${pjson.name}, version: ${pjson.version}`));

  // DM only
  robot.respond(regexp.createLevelUpAccount(), (msg) => wallet.levelUpAccount(msg, scoreKeeper));

  // admin
  robot.respond(regexp.createEraseUserScoreRegExp(), eraseUserScore);
  robot.respond(/try to map all slack users to db users/, (msg) => mapper.mapUsersToDb(msg, procVars));
  robot.respond(/try to map more data to all slack users to db users/, (msg) => mapper.mapMoreUserFieldsBySlackId(msg, procVars));
  robot.respond(/try to map @.* to db users/, (msg) => mapper.mapSingleUserToDb(msg, procVars));
  robot.respond(/unmap all users/, (msg) => mapper.unmapUsersToDb(msg, procVars));

  // event listeners
  robot.on('plus-plus', sendPlusPlusNotification);
  robot.on('plus-plus-false-positive', sendPlusPlusFalsePositiveNotification);
  /* eslint-enable */

  /**
   * Functions for responding to commands
   */
  async function upOrDownVote(msg) {
    const [fullText, premessage, name, operator, conjunction, reason] = msg.match;
    if (premessage || (!conjunction && reason)) {
      // circuit break a plus plus
      robot.emit('plus-plus-false-positive', {
        notificationMessage: `False positive detected in <#${msg.message.room}> from <@${msg.message.user.id}>:\nPre-Message text: [${!!premessage}].\nMissing Conjunction: [${!!(!conjunction && reason)}]\n\n${fullText}`,
        room: msg.message.room,
      });
      return;
    }
    const increment = operator.match(regexp.positiveOperators) ? 1 : -1;
    const { room, mentions } = msg.message;
    const cleanName = helpers.cleanName(name);
    let to = { name: cleanName };
    if (mentions) {
      to = mentions.filter((men) => men.type === 'user').shift();
      to.name = cleanName;
    }
    const cleanReason = helpers.cleanAndEncode(reason);
    const from = msg.message.user;

    robot.logger.debug(`${increment} score for [${to.name}] from [${from}]${cleanReason ? ` because ${cleanReason}` : ''} in [${room}]`);
    let user;
    try {
      user = await scoreKeeper.incrementScore(to, from, room, cleanReason, increment);
    } catch (e) {
      msg.send(e.message);
      return;
    }

    const message = helpers.getMessageForNewScore(user, cleanReason, robot);

    if (message) {
      msg.send(message);
      robot.emit('plus-plus', {
        notificationMessage: `<@${from.id}> ${operator.match(regexp.positiveOperators) ? 'sent' : 'removed'} a ${helpers.capitalizeFirstLetter(robot.name)} point ${operator.match(regexp.positiveOperators) ? 'to' : 'from'} <@${user.slackId}> in <#${room}>`,
        name: user.name,
        direction: operator,
        room,
        cleanReason,
        from,
      });
    }
  }

  async function giveTokenBetweenUsers(msg) {
    const [fullText, premessage, name, number, conjunction, reason] = msg.match;
    if (!conjunction && reason) {
      // circuit break a plus plus
      robot.emit('plus-plus-false-positive', {
        notificationMessage: `False positive detected in <#${msg.message.room}> from <@${msg.message.user.id}>:\nPre-Message text: [${!!premessage}].\nMissing Conjunction: [${!!(!conjunction && reason)}]\n\n${fullText}`,
        room: msg.message.room,
      });
      return;
    }
    const { room, mentions } = msg.message;
    const cleanName = helpers.cleanName(name);
    let to = { name: cleanName };
    if (mentions) {
      to = mentions.filter((men) => men.type === 'user').shift();
      to.name = cleanName;
    }
    const cleanReason = helpers.cleanAndEncode(reason);
    const from = msg.message.user;

    robot.logger.debug(`${number} score for [${mentions}] from [${from}]${cleanReason ? ` because ${cleanReason}` : ''} in [${room}]`);
    let response;
    try {
      response = await scoreKeeper.transferTokens(to, from, room, cleanReason, number);
    } catch (e) {
      msg.send(e.message);
      return;
    }

    const message = helpers.getMessageForTokenTransfer(robot,
      response.toUser,
      response.fromUser,
      number,
      cleanReason);

    if (message) {
      msg.send(message);
      robot.emit('plus-plus', {
        notificationMessage: `<@${from.id}> sent ${number} ${helpers.capitalizeFirstLetter(robot.name)} point${parseInt(number, 10) > 1 ? 's' : ''} to <@${response.toUser.slackId}> in <#${room}>`,
        name: response.toUser.name,
        direction: '+',
        room,
        cleanReason,
        from,
      });
    }
  }

  async function multipleUsersVote(msg) {
    const [fullText, premessage, names, operator, conjunction, reason] = msg.match;
    if (!names) {
      return;
    }
    if (premessage || (!conjunction && reason)) {
      // circuit break a plus plus
      robot.emit('plus-plus-false-positive', {
        notificationMessage: `False positive detected in <#${msg.message.room}> from <@${msg.message.user.id}>:\nPre-Message text: [${!!premessage}].\nMissing Conjunction: [${!!(!conjunction && reason)}]\n\n${fullText}`,
        room: msg.message.room,
      });
      return;
    }

    const namesArray = names.trim().toLowerCase().split(new RegExp(regexp.multiUserSeparator)).filter(Boolean);
    const from = msg.message.user;
    const { room, mentions } = msg.message;
    let to;
    if (mentions) {
      to = mentions.filter((men) => men.type === 'user');
    }
    const cleanReason = helpers.cleanAndEncode(reason);
    const increment = operator.match(regexp.positiveOperators) ? 1 : -1;

    const cleanNames = namesArray
      // Parse names
      .map((name) => {
        const cleanedName = helpers.cleanName(name);
        return cleanedName;
      })
      // Remove empty ones: {,,,}++
      .filter((name) => !!name.length)
      // Remove duplicates: {user1,user1}++
      .filter((name, pos, self) => self.indexOf(name) === pos);

    if (cleanNames.length !== to.length) {
      msg.send('We are having trouble mapping your multi-user plusplus. Please try again and only include @ mentions.');
      return;
    }

    let messages = [];
    const users = [];
    for (let i = 0; i < cleanNames.length; i++) {
      to[i].name = cleanNames[i];
      const user = await scoreKeeper.incrementScore(to[i], from, room, cleanReason, increment);
      if (user) {
        users.push(user);
        robot.logger.debug(`clean names map [${to[i].name}]: ${user.score}, the reason ${user.reasons[cleanReason]}`);
        messages.push(helpers.getMessageForNewScore(user, cleanReason, robot));
      }
    }
    messages = messages.filter((message) => !!message); // de-dupe

    robot.logger.debug(`These are the messages \n ${messages.join('\n')}`);
    msg.send(messages.join('\n'));

    for (const user of users) {
      robot.emit('plus-plus', {
        notificationMessage: `<@${from.id}> ${operator.match(regexp.positiveOperators) ? 'sent' : 'removed'} a ${helpers.capitalizeFirstLetter(robot.name)} point ${operator.match(regexp.positiveOperators) ? 'to' : 'from'} <@${user.slackId}> in <#${room}>`,
        name: user.name,
        direction: operator,
        room,
        cleanReason,
        from,
      });
    }
  }

  async function respondWithScore(msg) {
    const { mentions } = msg.message;
    const [fullText, premessage, conjunction, name] = msg.match;
    let to = { name: helpers.cleanName(name) };
    if (mentions) {
      const userMentions = mentions.filter((men) => men.type === 'user');
      to = userMentions.pop();
      to.name = name;
    }

    const user = await scoreKeeper.getUser(to);

    let tokenString = '.';
    if (user.accountLevel > 1) {
      tokenString = ` (*${user.token} ${helpers.capitalizeFirstLetter(robot.name)} `;
      tokenString = tokenString.concat(user.token > 1 ? 'Tokens*).' : 'Token*).');
    }
    let pointsGiven = 0;
    // eslint-disable-next-line guard-for-in
    for (const key in user.pointsGiven) {
      pointsGiven += parseInt(user.pointsGiven[key], 10);
    }
    const scoreStr = user.score > 1 ? 'points' : 'point';
    let baseString = `<@${user.slackId}> has ${user.score} ${scoreStr}${tokenString}`;
    baseString += `\nAccount Level: ${user.accountLevel}`;
    baseString += `\nTotal Points Given: ${pointsGiven}`;
    if (user[`${robot.name}Day`]) {
      const dateObj = new Date(user[`${robot.name}Day`]);
      baseString += `\n:birthday: ${helpers.capitalizeFirstLetter(robot.name)}day is ${moment(dateObj).format('MM-DD-yyyy')}`;
    }
    const keys = Object.keys(user.reasons);
    if (keys.length > 1) {
      const sampleReasons = {};
      const maxReasons = keys.length >= 5 ? 5 : keys.length;
      do {
        const randomNumber = _.random(0, keys.length - 1);
        const reason = keys[randomNumber];
        const value = user.reasons[keys[randomNumber]];
        sampleReasons[reason] = value;
      } while (Object.keys(sampleReasons).length < maxReasons);

      const reasonMap = _.reduce(sampleReasons, (memo, val, key) => {
        const decodedKey = helpers.decode(key);
        const pointStr = val > 1 ? 'points' : 'point';
        memo += `\n_${decodedKey}_: ${val} ${pointStr}`;
        return memo;
      }, '');

      return msg.send(`${baseString}\n\n:star: Here are some ${procVars.reasonsKeyword} :star:${reasonMap}`);
    }
    return msg.send(`${baseString}`);
  }

  async function tellHowMuchPointsAreWorth(msg) {
    try {
      const resp = await axios({
        url: 'https://api.coindesk.com/v1/bpi/currentprice/ARS.json',
      });

      const bitcoin = resp.data.bpi.USD.rate_float;
      const ars = resp.data.bpi.ARS.rate_float;
      const satoshi = bitcoin / 1e8;
      return msg.send(`A bitcoin is worth ${bitcoin} USD right now (${ars} ARS), a satoshi is about ${satoshi}, and ${msg.robot.name} points are worth nothing!`);
    } catch (e) {
      return msg.send(`Seems like we are having trouble getting some data... Don't worry, though, your ${msg.robot.name} points are still worth nothing!`);
    }
  }

  async function respondWithLeaderLoserBoard(msg) {
    const amount = parseInt(msg.match[2], 10) || 10;
    const topOrBottom = helpers.capitalizeFirstLetter(msg.match[1].trim());
    const methodName = `get${topOrBottom}Scores`;

    const tops = await scoreKeeper.databaseService[methodName](amount);
    const message = [];
    if (tops.length > 0) {
      for (let i = 0, end = tops.length - 1, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
        const person = tops[i].slackId ? `<@${tops[i].slackId}>` : tops[i].name;
        if (tops[i].accountLevel && tops[i].accountLevel > 1) {
          const tokenStr = tops[i].token > 1 ? 'Tokens' : 'Token';
          message.push(`${i + 1}. ${person}: ${tops[i].score} (*${tops[i].token} ${helpers.capitalizeFirstLetter(this.robot.name)} ${tokenStr}*)`);
        } else {
          message.push(`${i + 1}. ${person}: ${tops[i].score}`);
        }
      }
    } else {
      message.push('No scores to keep track of yet!');
    }

    const graphSize = Math.min(tops.length, Math.min(amount, 20));
    message.splice(0, 0, clark(_.take(_.map(tops, 'score'), graphSize)));

    return msg.send(message.join('\n'));
  }

  async function respondWithLeaderLoserTokenBoard(msg) {
    const amount = parseInt(msg.match[2], 10) || 10;
    const topOrBottom = helpers.capitalizeFirstLetter(msg.match[1].trim());
    const methodName = `get${topOrBottom}Tokens`;

    const tops = await scoreKeeper.databaseService[methodName](amount);

    const message = [];
    if (tops.length > 0) {
      for (let i = 0, end = tops.length - 1, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
        const person = tops[i].slackId ? `<@${tops[i].slackId}>` : tops[i].name;
        const tokenStr = tops[i].token > 1 ? 'Tokens' : 'Token';
        const pointStr = tops[i].score > 1 ? 'points' : 'point';
        message.push(`${i + 1}. ${person}: *${tops[i].token} ${helpers.capitalizeFirstLetter(this.robot.name)} ${tokenStr}* (${tops[i].score} ${pointStr})`);
      }
    } else {
      message.push('No scores to keep track of yet!');
    }

    const graphSize = Math.min(tops.length, Math.min(amount, 20));
    message.splice(0, 0, clark(_.take(_.map(tops, 'token'), graphSize)));

    return msg.send(message.join('\n'));
  }

  async function respondWithUsersBotDay(msg) {
    let userToLookup = msg.message.user.name;
    const isMy = msg.match[2].toLowerCase() !== 'my';
    let messageName = 'Your';
    robot.logger.debug(`respond with users bot day ${msg.match}`);
    if (isMy) {
      userToLookup = helpers.cleanName(msg.match[2]);
    }
    const user = await scoreKeeper.databaseService.getUser({ name: userToLookup });
    if (isMy) {
      messageName = user.slackId ? `<@${user.slackId}>'s` : `${user.name}'s`;
    }
    const dateObj = new Date(user[`${robot.name}Day`]);
    msg.send(`${messageName} ${robot.name}day is ${moment(dateObj).format('MM-DD-yyyy')}`);
  }

  async function eraseUserScore(msg) {
    let erased;
    const [fullText, premessage, name, conjunction, reason] = msg.match;
    const from = msg.message.user;
    const { user } = msg.envelope;
    const { room, mentions } = msg.message;

    const cleanReason = helpers.cleanAndEncode(reason);
    let to = mentions.filter((men) => men.type === 'user').shift();
    const cleanName = helpers.cleanName(name);
    if (!to) {
      to = { name: cleanName };
    } else {
      to.name = cleanName;
    }

    const isAdmin = (this.robot.auth ? this.robot.auth.hasRole(user, 'plusplus-admin') : undefined) || (this.robot.auth ? this.robot.auth.hasRole(user, 'admin') : undefined);

    if (!this.robot.auth || !isAdmin) {
      msg.reply("Sorry, you don't have authorization to do that.");
      return;
    } if (isAdmin) {
      erased = await scoreKeeper.erase(to, from, room, cleanReason);
    }

    if (erased) {
      const decodedReason = helpers.decode(cleanReason);
      const message = !decodedReason ? `Erased the following reason from ${to.name}: ${decodedReason}` : `Erased points for ${to.name}`;
      msg.send(message);
    }
  }

  function respondWithHelpGuidance(msg) {
    const helpMessage = ''.concat('`<name>++ [<reason>]` - Increment score for a name (for a reason)\n')
      .concat('`<name>-- [<reason>]` - Decrement score for a name (for a reason)\n')
      .concat('`{name1, name2, name3}++ [<reason>]` - Increment score for all names (for a reason)\n')
      .concat('`{name1, name2, name3}-- [<reason>]` - Decrement score for all names (for a reason) \n')
      .concat('`{name1, name2, name3}-- [<reason>]` - Decrement score for all names (for a reason) \n')
      .concat(`\`@${msg.robot.name} score <name>\` - Display the score for a name and some of the reasons\n`)
      .concat(`\`@${msg.robot.name} top <amount>\` - Display the top scoring <amount>\n`)
      .concat(`\`@${msg.robot.name} erase <name> [<reason>]\` - Remove the score for a name (for a reason) \n`)
      .concat(`\`@${msg.robot.name} level me up\` - Level up your account for some additional ${msg.robot.name}iness \n`)
      .concat('`how much are <point_type> points worth` - Shows how much <point_type> points are worth\n');

    const message = {
      attachments: [{
        color: '#FEA500',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Need help with ${msg.robot.name}?`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '_Commands_:',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: helpMessage,
            },
          },
        ],
      }],
    };

    if (procVars.furtherHelpUrl !== 'undefined') {
      message.attachments[0].blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `For further help please visit ${procVars.furtherHelpUrl}`,
        },
      });
    }
    msg.send(message);
  }

  function sendPlusPlusNotification(notificationObject) {
    if (procVars.notificationsRoom) {
      robot.messageRoom(procVars.notificationsRoom, notificationObject.notificationMessage);
    }
  }

  function sendPlusPlusFalsePositiveNotification(notificationObject) {
    if (procVars.falsePositiveNotificationsRoom) {
      robot.messageRoom(procVars.falsePositiveNotificationsRoom, notificationObject.notificationMessage);
    }
  }
};
