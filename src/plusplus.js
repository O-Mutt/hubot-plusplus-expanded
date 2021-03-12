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
//   HUBOT_PLUSPLUS_REASON_CONJUNCTIONS: a pipe separated list of conjunctionss to
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
// Author: Mutmatt

const clark = require('clark');
const { default: axios } = require('axios');
const _ = require('lodash');
const moment = require('moment');
const ScoreKeeper = require('./scorekeeper');
const helper = require('./helpers');

module.exports = function plusPlus(robot) {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/plusPlus';
  const spamMessage = process.env.HUBOT_SPAM_MESSAGE || 'Looks like you hit the spam filter. Please slow your roll.';
  const furtherFeedbackSuggestedScore = process.env.HUBOT_FURTHER_FEEDBACK_SCORE || 10;
  const companyName = process.env.HUBOT_COMPANY_NAME || 'Auth0';
  const peerFeedbackUrl = process.env.HUBOT_PEER_FEEDBACK_URL || `'Lattice' (https://${companyName}.latticehq.com/)`;
  const reasonsKeyword = process.env.HUBOT_PLUSPLUS_REASONS || 'reasons';
  const scoreKeeper = new ScoreKeeper(robot, mongoUri, peerFeedbackUrl, spamMessage, furtherFeedbackSuggestedScore);
  scoreKeeper.init();

  const upOrDownVoteRegexp = helper.createUpDownVoteRegExp();
  const askForScoreRegexp = helper.createAskForScoreRegExp();
  const multiUserVoteRegExp = helper.createMultiUserVoteRegExp();
  const topOrBottomRegExp = helper.createTopBottomRegExp();
  const eraseScoreRegExp = helper.createEraseUserScoreRegExp();
  const botDayRegexp = helper.createBotDayRegExp(robot.name);

  /* eslint-disable */
  // listen to everything
  robot.hear(upOrDownVoteRegexp, upOrDownVote);
  robot.hear(new RegExp(`how much .*point.*`, 'i'), tellHowMuchPointsAreWorth);
  robot.hear(multiUserVoteRegExp, multipleUsersVote);

  // listen for bot tag/ping
  robot.respond(askForScoreRegexp, respondWithScore);
  robot.respond(topOrBottomRegExp, respondWithLeaderLoserBoard);
  robot.respond(botDayRegexp, respondWithUsersBotDay);

  // admin
  robot.respond(eraseScoreRegExp, eraseUserScore);
  /* eslint-enable */

  /**
   * Functions for responding to commands
   */
  async function upOrDownVote(msg) {
    // eslint-disable-next-line
    let [fullMatch, name, operator, reason] = msg.match;
    const { room } = msg.message;
    // eslint-disable-next-line
    name = helper.cleanName(name);
    reason = helper.cleanAndEncode(reason);
    const from = msg.message.user;

    if (name === 'heat' && helper.positiveOperators === operator) {
      msg.send('podríamos subir un gradin la calefa???');
    }

    let newScore; let reasonScore; let userObject;
    robot.logger.debug(`${operator === helper.positiveOperators ? 'add' : 'remove'} score for [${name}] from [${name}]`);
    if (helper.positiveOperators === operator) {
      [newScore, reasonScore, userObject] = await scoreKeeper.add(name, from, room, reason);
    } else if (`(${helper.negativeOperators})`.match(operator)) {
      [newScore, reasonScore, userObject] = await scoreKeeper.subtract(name, from, room, reason);
    }

    if (newScore === null && reasonScore === null) {
      return;
    }

    const message = helper.getMessageForNewScore(newScore, name, operator, reason, reasonScore, userObject[`${robot.name}Day`], robot.name);

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
    const encodedReason = helper.cleanAndEncode(reason);

    const cleanNames = namesArray
      // Parse names
      .map((name) => helper.cleanName(name).match(new RegExp(helper.votedObject, 'i'))[1])
      // Remove empty ones: {,,,}++
      .filter((name) => !!name.length)
      // Remove duplicates: {user1,user1}++
      .filter((name, pos, self) => self.indexOf(name) === pos);

    // If after the parse + cleanup of the names there is only one name, ignore it.
    // {user1}++
    if (cleanNames.length === 1) return;

    let messages;
    let results;
    if (helper.positiveOperators === operator) {
      results = cleanNames.map(async (name) => {
        const [newScore, reasonScore, userObject] = await scoreKeeper.add(name, from, room, encodedReason);
        robot.logger.debug(`clean names map [${name}]: ${newScore}, the reason ${reasonScore}`);
        return helper.getMessageForNewScore(newScore, name, operator, encodedReason, reasonScore, userObject[`${robot.name}Day`], robot.name);
      });
    } else if (`(${helper.negativeOperators})`.match(operator)) {
      results = cleanNames.map(async (name) => {
        const [newScore, reasonScore, userObject] = await scoreKeeper.subtract(name, from, room, encodedReason);
        return helper.getMessageForNewScore(newScore, name, operator, encodedReason, reasonScore, userObject[`${robot.name}Day`], robot.name);
      });
    }
    messages = await Promise.all(results);
    messages = messages.filter((message) => !!message);

    if (messages.length) {
      robot.logger.debug(`These are the messages \n ${messages.join('\n')}`);
      msg.send(messages.join('\n'));
      cleanNames.map((name) => robot.emit('plus-one', {
        name,
        direction: operator,
        room,
        encodedReason,
        from,
      }));
    } else {
      msg.reply('please slow your roll.');
    }
  }

  async function respondWithScore(msg) {
    const name = helper.cleanName(msg.match[2]);

    const score = await scoreKeeper.scoreForUser(name);
    const reasons = await scoreKeeper.reasonsForUser(name);

    if (typeof reasons === 'object' && Object.keys(reasons).length > 0) {
      const sampleReasons = {};
      const keys = Object.keys(reasons);
      const maxReasons = keys.length >= 5 ? 5 : keys.length - 1;
      do {
        const randomNumber = _.random(0, keys.length - 1);
        const reason = keys[randomNumber];
        const value = reasons[keys[randomNumber]];
        sampleReasons[reason] = value;
      } while (Object.keys(sampleReasons).length < maxReasons);

      const reasonMap = _.reduce(sampleReasons, (memo, val, key) => {
        const decodedKey = helper.decode(key);
        const pointStr = val > 1 ? 'points' : 'point';
        // eslint-disable-next-line
        memo += `\n_${decodedKey}_: ${val} ${pointStr}`;
        return memo;
      }, '');
      return msg.send(`${name} has ${score} points.\n\n:star: Here are some ${reasonsKeyword} :star:${reasonMap}`);
    }
    return msg.send(`${name} has ${score} points`);
  }

  function tellHowMuchPointsAreWorth(msg) {
    msg.send("getting the quote");
    const promises = [];
    promises.push(
      axios({
        url: 'https://www.marketwatch.com/investing/stock/okta',
        transformResponse: [data => {
          const startIndex = data.indexOf('<meta name="price" content="');
          const oktaStockQuota = data.substring(startIndex + 28, startIndex + 35);
          return oktaStockQuota;
        }]
      }).then(response => {
        return response.data;
      })
    );
    promises.push(
      axios({
        url: 'https://api.coindesk.com/v1/bpi/currentprice/ARS.json'
      }).then(resp => {
      const bitcoin = resp.data.bpi.USD.rate_float;
      const ars = resp.data.bpi.ARS.rate_float;
      const satoshi = bitcoin / 1e8;
      return { bitcoin, ars, satoshi };
      })
    );
      
    Promise.all(promises).then(promise => {
      // eslint-disable-next-line
      return msg.send(`A bitcoin is worth ${promise[1].bitcoin} USD right now (${promise[1].ars} ARS), a satoshi is about ${promise[1].satoshi}, Okta is worth ${promise[0]}, and ${msg.message._robot_name} points are worth nothing!`);
    }).catch(err => {
      msg.send(err);
      return msg.send(`Seems like we are having trouble getting some data... Don\'t worry, though, your ${msg.message._robot_name} points are still worth nothing!`);
    });
  }

  async function respondWithLeaderLoserBoard(msg) {
    const amount = parseInt(msg.match[2], 10) || 10;
    const topOrBottom = msg.match[1].trim();

    const tops = await scoreKeeper[topOrBottom](amount);

    const message = [];
    if (tops.length > 0) {
      // eslint-disable-next-line
      for (let i = 0, end = tops.length - 1, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
        message.push(`${i + 1}. ${tops[i].name} : ${tops[i].score}`);
      }
    } else {
      message.push('No scores to keep track of yet!');
    }

    const graphSize = Math.min(tops.length, Math.min(amount, 20));
    message.splice(0, 0, clark(_.take(_.map(tops, 'score'), graphSize)));

    return msg.send(message.join('\n'));
  }

  async function respondWithUsersBotDay(msg) {
    let userToLookup = msg.message.user.name;
    let messageName = 'Your';
    robot.logger.debug(`respond with users bot day ${msg.match}`);
    if (msg.match[2].toLowerCase() !== 'my') {
      userToLookup = helper.cleanName(msg.match[2]);
      messageName = `${userToLookup}'s`;
    }
    const user = await scoreKeeper.getUser(userToLookup);
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
    reason = helper.cleanAndEncode(reason);

    name = helper.cleanName(name);

    const isAdmin = (this.robot.auth ? this.robot.auth.hasRole(user, 'plusplus-admin') : undefined) || (this.robot.auth ? this.robot.auth.hasRole(user, 'admin') : undefined);

    if (!this.robot.auth || !isAdmin) {
      msg.reply("Sorry, you don't have authorization to do that.");
      return;
    } if (isAdmin) {
      erased = await scoreKeeper.erase(name, from, room, reason);
    }

    if (erased) {
      const decodedReason = helper.decode(reason);
      const message = (!decodedReason) ? `Erased the following reason from ${name}: ${decodedReason}` : `Erased points for ${name}`;
      msg.send(message);
    }
  }
};
