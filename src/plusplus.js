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
const regexp = require('./regexp');
const wallet = require('./wallet');
const ScoreKeeper = require('./scorekeeper');
const helpers = require('./helpers');
// this may need to move or be generic...er
const token = require('./token');
const decrypt = require('./services/decrypt');

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

module.exports = function plusPlus(robot) {
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

  /* eslint-disable */
  // listen to everything
  robot.hear(regexp.createUpDownVoteRegExp(), upOrDownVote);
  robot.hear(new RegExp(`how much .*point.*`, 'i'), tellHowMuchPointsAreWorth);
  robot.hear(regexp.createMultiUserVoteRegExp(), multipleUsersVote);

  // listen for bot tag/ping
  robot.respond(regexp.createAskForScoreRegExp(), respondWithScore);
  robot.respond(regexp.createTopBottomRegExp(), respondWithLeaderLoserBoard);
  robot.respond(regexp.createTopBottomTokenRegExp(), respondWithLeaderLoserTokenBoard);
  robot.respond(regexp.createBotDayRegExp(robot.name), respondWithUsersBotDay);
  robot.respond(regexp.getHelp(), respondWithHelpGuidance);
  robot.respond(regexp.getBotWallet(), (msg) => wallet.botWalletCount(msg, scoreKeeper));

  // DM only
  robot.respond(regexp.createLevelUpAccount(), (msg) => wallet.levelUpAccount(msg, scoreKeeper));

  // admin
  robot.respond(regexp.createEraseUserScoreRegExp(), eraseUserScore);
  /* eslint-enable */

  /**
   * Functions for responding to commands
   */
  async function upOrDownVote(msg) {
    // eslint-disable-next-line
    let [fullMatch, name, operator, reason] = msg.match;
    const methodName = operator === regexp.positiveOperatorsString ? 'add' : 'subtract';
    const { room } = msg.message;
    // eslint-disable-next-line
    const cleanName = helpers.cleanName(name);
    const cleanReason = helpers.cleanAndEncode(reason);
    const from = msg.message.user;

    robot.logger.debug(`${methodName} score for [${cleanName}] from [${from}]${cleanReason ? ` because ${cleanReason}` : ''} in [${room}]`);
    const user = await scoreKeeper[methodName](cleanName, from, room, reason);

    if (!user) {
      return;
    }

    const message = helpers.getMessageForNewScore(user, reason, robot);

    if (message) {
      msg.send(message);
      robot.emit('plus-one', {
        name,
        direction: operator,
        room,
        reason,
        from,
      });
    }
  }

  async function multipleUsersVote(msg) {
    // eslint-disable-next-line
    const [fullMatch, names, dummy, operator, reason] = msg.match;
    if (!names) {
      return;
    }

    const namesArray = names.trim().toLowerCase().split(',');
    const from = msg.message.user;
    const { room } = msg.message;
    const cleanReason = helpers.cleanAndEncode(reason);
    const methodName = operator === regexp.positiveOperatorsString ? 'add' : 'subtract';

    const cleanNames = namesArray
      // Parse names
      .map((name) => helpers.cleanName(name).match(new RegExp(regexp.votedObject, 'i'))[1])
      // Remove empty ones: {,,,}++
      .filter((name) => !!name.length)
      // Remove duplicates: {user1,user1}++
      .filter((name, pos, self) => self.indexOf(name) === pos);

    // If after the parse + cleanup of the names there is only one name, ignore it.
    // {user1}++
    if (cleanNames.length === 1) return;

    let messages = [];
    cleanNames.map(async (cleanName) => {
      const user = await scoreKeeper[methodName](cleanName, from, room, cleanReason);
      robot.logger.debug(`clean names map [${cleanName}]: ${user.score}, the reason ${user.reasons[cleanReason]}`);
      if (user) {
        messages.push(helpers.getMessageForNewScore(user, reason, robot));
      }
    });
    messages = messages.filter((message) => !!message); // de-dupe

    robot.logger.debug(`These are the messages \n ${messages.join('\n')}`);
    msg.send(messages.join('\n'));
    cleanNames.map((name) => robot.emit('plus-one', {
      name,
      direction: operator,
      room,
      cleanReason,
      from,
    }));
  }

  async function respondWithScore(msg) {
    const name = helpers.cleanName(msg.match[2]);

    const user = await scoreKeeper.getUser(name);
    let tokenString = '.';
    if (user.accountLevel > 1) {
      tokenString = ` (*${user.token} ${helpers.capitalizeFirstLetter(this.robot.name)} `;
      tokenString = tokenString.concat(user.token > 1 ? 'Tokens*).' : 'Token*).');
    }
    const scoreStr = user.score > 1 ? 'points' : 'point';
    const baseString = `${user.name} has ${user.score} ${scoreStr}${tokenString}`;

    const keys = Object.keys(user.reasons);
    if (keys.length > 1) {
      const sampleReasons = {};
      const maxReasons = keys.length >= 5 ? 5 : keys.length - 1;
      do {
        const randomNumber = _.random(0, keys.length - 1);
        const reason = keys[randomNumber];
        const value = user.reasons[keys[randomNumber]];
        sampleReasons[reason] = value;
      } while (Object.keys(sampleReasons).length < maxReasons);

      const reasonMap = _.reduce(sampleReasons, (memo, val, key) => {
        const decodedKey = helpers.decode(key);
        const pointStr = val > 1 ? 'points' : 'point';
        // eslint-disable-next-line
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
      // eslint-disable-next-line no-underscore-dangle
      return msg.send(`A bitcoin is worth ${bitcoin} USD right now (${ars} ARS), a satoshi is about ${satoshi}, and ${msg.robot.name} points are worth nothing!`);
    } catch (e) {
      // eslint-disable-next-line no-underscore-dangle
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
      // eslint-disable-next-line
      for (let i = 0, end = tops.length - 1, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
        if (tops[i].accountLevel && tops[i].accountLevel > 1) {
          const tokenStr = tops[i].token > 1 ? 'tokens' : 'token'
          message.push(`${i + 1}. ${tops[i].name} : ${tops[i].score} (${tops[i].token} ${tokenStr})`);
        } else {
          message.push(`${i + 1}. ${tops[i].name} : ${tops[i].score}`);
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
      // eslint-disable-next-line
      for (let i = 0, end = tops.length - 1, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
        const tokenStr = tops[i].token > 1 ? 'tokens' : 'token'
        const pointStr = tops[i].score > 1 ? 'points' : 'point'
        message.push(`${i + 1}. ${tops[i].name} : ${tops[i].token} ${tokenStr} (${tops[i].score} ${pointStr})`);
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
    let messageName = 'Your';
    robot.logger.debug(`respond with users bot day ${msg.match}`);
    if (msg.match[2].toLowerCase() !== 'my') {
      userToLookup = helpers.cleanName(msg.match[2]);
      messageName = `${userToLookup}'s`;
    }
    const user = await scoreKeeper.databaseService.getUser(userToLookup);
    const dateObj = new Date(user[`${robot.name}Day`]);
    msg.send(`${messageName} ${robot.name}day is ${moment(dateObj).format('MM-DD-yyyy')}`);
  }

  async function eraseUserScore(msg) {
    let erased;
    // eslint-disable-next-line
    let [__, name, reason] = Array.from(msg.match);
    const from = msg.message.user;
    const { user } = msg.envelope;
    const { room } = msg.message;
    reason = helpers.cleanAndEncode(reason);

    name = helpers.cleanName(name);

    const isAdmin = (this.robot.auth ? this.robot.auth.hasRole(user, 'plusplus-admin') : undefined) || (this.robot.auth ? this.robot.auth.hasRole(user, 'admin') : undefined);

    if (!this.robot.auth || !isAdmin) {
      msg.reply("Sorry, you don't have authorization to do that.");
      return;
    } if (isAdmin) {
      erased = await scoreKeeper.erase(name, from, room, reason);
    }

    if (erased) {
      const decodedReason = helpers.decode(reason);
      const message = !decodedReason ? `Erased the following reason from ${name}: ${decodedReason}` : `Erased points for ${name}`;
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
    msg.send(message);
  }
};
