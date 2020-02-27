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
//   HUBOT_PLUSPLUS_REASON_CONJUNCTIONS: a pipe separated list of conjuntions to
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
const request = require('request');
const _ = require('lodash');
const ScoreKeeper = require('./scorekeeper');
const helper = require('./helpers');

module.exports = function plusPlus(robot) {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/plusPlus';
  const spamMessage = process.env.HUBOT_SPAM_MESSAGE || 'Looks like you hit the spam filter. Please slow your role.';
  const futherFeedbackSuggestedScore = process.env.HUBOT_FURTHER_FEEDBACK_SCORE;
  const companyName = process.env.HUBOT_COMPANY_NAME || 'Auth0';
  const peerFeedbackUrl = process.env.HUBOT_PEER_FEEDBACK_URL || `'Lattice' (https://${companyName}.latticehq.com/)`;
  const reasonsKeyword = process.env.HUBOT_PLUSPLUS_REASONS || 'reasons';
  const scoreKeeper = new ScoreKeeper(robot, mongoUri, peerFeedbackUrl, spamMessage, futherFeedbackSuggestedScore);
  scoreKeeper.init();

  const upOrDownVoteRegexp = helper.createUpDownVoteRegExp();
  const askForScoreRegexp = helper.createAskForScoreRegExp();
  const multiUserVoteRegExp = helper.createMultiUserVoteRegExp();
  const topOrBottomRegExp = helper.createTopBottomRegExp();
  const eraseScoreRegExp = helper.createEraseUserScoreRegExp();

  /* eslint-disable */
  // listen to everything
  robot.hear(upOrDownVoteRegexp, upOrDownVote);
  robot.hear(/^[Hh]ow\s*much\s*.*point.*$/, tellHowMuchPointsAreWorth);
  robot.hear(multiUserVoteRegExp, multipleUsersVote);

  // listen for bot tag/ping
  robot.respond(askForScoreRegexp, respondWithScore);
  robot.respond(topOrBottomRegExp, respondWithLeaderLoserBoard);

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

    let newScore; let
      reasonScore;
    if (helper.positiveOperators === operator) {
      robot.logger.debug(`add score for ${name}, ${from.name}`);
      [newScore, reasonScore] = await scoreKeeper.add(name, from, room, reason);
    } else if (`(${helper.negativeOperators})`.match(operator)) {
      robot.logger.debug(`removing score for ${name}, ${from.name}`);
      [newScore, reasonScore] = await scoreKeeper.subtract(name, from, room, reason);
    }

    if (newScore === null && reasonScore === null) {
      return;
    }

    const message = helper.getMessageForNewScore(newScore, name, operator, reason, reasonScore);

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
        const [newScore, reasonScore] = await scoreKeeper.add(name, from, room, encodedReason);
        robot.logger.debug(`clean names map [${name}]: ${newScore}, the reason ${reasonScore}`);
        return helper.getMessageForNewScore(newScore, name, operator, encodedReason, reasonScore);
      });
    } else if (`(${helper.negativeOperators})`.match(operator)) {
      results = cleanNames.map(async (name) => {
        const [newScore, reasonScore] = await scoreKeeper.subtract(name, from, room, encodedReason);
        return helper.getMessageForNewScore(newScore, name, operator, encodedReason, reasonScore);
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
      const reasonMap = _.reduce(reasons, (memo, val, key) => {
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
    request.get('https://api.coindesk.com/v1/bpi/currentprice/ARS.json', { json: true }, (err, res, body) => {
      const bitcoin = body.bpi.USD.rate_float;
      const ars = body.bpi.ARS.rate_float;
      const satoshi = bitcoin / 1e8;
      // eslint-disable-next-line
      return msg.send(`A bitcoin is worth ${bitcoin} USD right now (${ars} ARS), a satoshi is about ${satoshi} and ${msg.message._robot_name} points are worth nothing!`);
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

    if (topOrBottom === 'top') {
      const graphSize = Math.min(tops.length, Math.min(amount, 20));
      message.splice(0, 0, clark(_.first(_.pluck(tops, 'score'), graphSize)));
    }

    return msg.send(message.join('\n'));
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
