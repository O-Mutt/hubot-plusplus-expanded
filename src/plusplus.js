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
const regExpCreator = require('./lib/regexpCreator');
const ScoreKeeper = require('./lib/services/scorekeeper');
const helpers = require('./lib/helpers');
// this may need to move or be generic...er
const token = require('./lib/token.json');
const decrypt = require('./lib/services/decrypt');

module.exports = (robot) => {
  const procVars = helpers.getProcessVariables(process.env);
  const scoreKeeper = new ScoreKeeper({ robot, ...procVars });

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

  // listen to everything
  robot.hear(regExpCreator.createUpDownVoteRegExp(), upOrDownVote);
  robot.hear(new RegExp('how much .*point.*', 'i'), tellHowMuchPointsAreWorth);
  robot.hear(regExpCreator.createMultiUserVoteRegExp(), multipleUsersVote);

  // listen for bot tag/ping
  robot.respond(regExpCreator.createGiveTokenRegExp(), giveTokenBetweenUsers);
  robot.respond(regExpCreator.getHelp(), respondWithHelpGuidance);
  robot.respond(new RegExp(/(plusplus version|-v|--version)/, 'i'), (msg) => msg.send(`${helpers.capitalizeFirstLetter(msg.robot.name)} ${pjson.name}, version: ${pjson.version}`));

  // admin
  robot.respond(regExpCreator.createEraseUserScoreRegExp(), eraseUserScore);

  /**
   * Functions for responding to commands
   */
  async function upOrDownVote(msg) {
    const [fullText, premessage, name, operator, conjunction, reason] = msg.match;

    if (helpers.isKnownFalsePositive(premessage, conjunction, reason, operator)) {
      // circuit break a plus plus
      robot.emit('plus-plus-failure', {
        notificationMessage: `False positive detected in <#${msg.message.room}> from <@${msg.message.user.id}>:\nPre-Message text: [${!!premessage}].\nMissing Conjunction: [${!!(!conjunction && reason)}]\n\n${fullText}`,
        room: msg.message.room,
      });
      return;
    }
    const increment = operator.match(regExpCreator.positiveOperators) ? 1 : -1;
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
    let toUser; let fromUser;
    try {
      ({ toUser, fromUser } = await scoreKeeper.incrementScore(to, from, room, cleanReason, increment));
    } catch (e) {
      msg.send(e.message);
      return;
    }

    const message = helpers.getMessageForNewScore(toUser, cleanReason, robot);

    if (message) {
      msg.send(message);
      robot.emit('plus-plus', {
        notificationMessage: `<@${fromUser.slackId}> ${operator.match(regExpCreator.positiveOperators) ? 'sent' : 'removed'} a ${helpers.capitalizeFirstLetter(robot.name)} point ${operator.match(regExpCreator.positiveOperators) ? 'to' : 'from'} <@${toUser.slackId}> in <#${room}>`,
        sender: fromUser,
        recipient: toUser,
        direction: operator,
        amount: 1,
        room,
        reason: cleanReason,
        msg,
      });
    }
  }

  async function giveTokenBetweenUsers(msg) {
    const [fullText, premessage, name, number, conjunction, reason] = msg.match;
    if (!conjunction && reason) {
      // circuit break a plus plus
      robot.emit('plus-plus-failure', {
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
        notificationMessage: `<@${response.fromUser.slackId}> sent ${number} ${helpers.capitalizeFirstLetter(robot.name)} point${parseInt(number, 10) > 1 ? 's' : ''} to <@${response.toUser.slackId}> in <#${room}>`,
        recipient: response.toUser,
        sender: response.fromUser,
        direction: '++',
        amount: number,
        room,
        reason: cleanReason,
        msg,
      });
    }
  }

  async function multipleUsersVote(msg) {
    const [fullText, premessage, names, operator, conjunction, reason] = msg.match;
    if (!names) {
      return;
    }
    if (helpers.isKnownFalsePositive(premessage, conjunction, reason, operator)) {
      // circuit break a plus plus
      robot.emit('plus-plus-failure', {
        notificationMessage: `False positive detected in <#${msg.message.room}> from <@${msg.message.user.id}>:\nPre-Message text: [${!!premessage}].\nMissing Conjunction: [${!!(!conjunction && reason)}]\n\n${fullText}`,
        room: msg.message.room,
      });
      return;
    }

    const namesArray = names.trim().toLowerCase().split(new RegExp(regExpCreator.multiUserSeparator)).filter(Boolean);
    const from = msg.message.user;
    const { room, mentions } = msg.message;
    let to;
    if (mentions) {
      to = mentions.filter((men) => men.type === 'user');
    }
    const cleanReason = helpers.cleanAndEncode(reason);
    const increment = operator.match(regExpCreator.positiveOperators) ? 1 : -1;

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
    const toUsers = [];
    let fromUser;
    for (let i = 0; i < cleanNames.length; i++) {
      to[i].name = cleanNames[i];
      let toUser;
      ({ toUser, fromUser } = await scoreKeeper.incrementScore(to[i], from, room, cleanReason, increment));
      if (toUser) {
        toUsers.push(toUser);
        robot.logger.debug(`clean names map [${to[i].name}]: ${toUser.score}, the reason ${toUser.reasons[cleanReason]}`);
        messages.push(helpers.getMessageForNewScore(toUser, cleanReason, robot));
      }
    }
    messages = messages.filter((message) => !!message); // de-dupe

    robot.logger.debug(`These are the messages \n ${messages.join('\n')}`);
    msg.send(messages.join('\n'));

    for (const user of toUsers) {
      robot.emit('plus-plus', {
        notificationMessage: `<@${fromUser.slackId}> ${operator.match(regExpCreator.positiveOperators) ? 'sent' : 'removed'} a ${helpers.capitalizeFirstLetter(robot.name)} point ${operator.match(regExpCreator.positiveOperators) ? 'to' : 'from'} <@${user.slackId}> in <#${room}>`,
        sender: fromUser,
        recipient: user,
        direction: operator,
        amount: 1,
        room,
        reason: cleanReason,
        msg,
      });
    }
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
};
