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
//   how much are hubot points worth (how much point) - Shows how much hubot points are worth in real time
//
//
// Author:

const clark = require("clark");
const ScoreKeeper = require('./scorekeeper');
const helper = require('./helpers');
const request = require('request');
const _ = require('underscore');

// Description:
//   Praise users or things.
//
// Author:
//   auth0
module.exports = function(robot) {
  const scoreKeeper = new ScoreKeeper(robot);
  const reasonsKeyword = process.env.HUBOT_PLUSPLUS_REASONS || 'reasons';

  const upOrDownVoteRegexp = helper.createUpDownVoteRegExp();
  const askForScoreRegexp = helper.createAskForScoreRegExp();
  const multiUserVoteRegExp = helper.createMultiUserVoteRegExp();
  const topOrBottomRegExp = helper.createTopBottomRegExp();
  const eraseScoreRegExp = helper.createEraseUserScoreRegExp();
  
  // listen to everything
  robot.hear(upOrDownVoteRegexp, upOrDownVote);
  robot.hear(/^[Hh]ow\s*much\s*.*point.*$/, tellHowMuchPointsAreWorth);
  robot.hear(multiUserVoteRegExp, multipleUsersVote);

  // listen for bot tag/ping
  robot.respond(askForScoreRegexp, respondWithScore);
  robot.respond(topOrBottomRegExp, respondWithLeaderLoserBoard);
  
  // admin
  robot.respond(eraseScoreRegExp , eraseUserScore);


  /**
   * Functions for responding to commands
   */
  async function upOrDownVote(msg) {
    let [ fullMatch, name, operator, reason ] = msg.match;
    const room = msg.message.room
    name = helper.cleanName(name).replace(msg.message._robot_name, '');
    reason = reason != null ? reason.trim().toLowerCase() : undefined;
    from = msg.message.user.name.toLowerCase();
    
    if (name === 'heat' && operator == '++') {
      msg.send('podríamos subir un gradin la calefa???');
    }
    
    let newScore, reasonScore;
    if (operator === '++') {
      robot.logger.debug(`add score for ${name}, ${from}`);
      [ newScore, reasonScore ] = await scoreKeeper.add(name, from, room, reason);
    } else if (operator === '--') {
      [ newScore, reasonScore ] = await scoreKeeper.subtract(name, from, room, reason);
    }
    
    if (newScore === null && reasonScore === null) {
      msg.reply("please slow your roll.");
      return;
    }

    const message = getMessageForNewScore(newScore, name, operator, reason, reasonScore);

    if (message) {
      msg.send(message);
      robot.emit("plus-one", {
        name:      name,
        direction: operator,
        room:      room,
        reason:    reason,
        from:      from
      });
    }
  }

  function multipleUsersVote(msg) {
    let [ fullMatch, names, dummy, operator, reason ] = msg.match;
    if (!names) {
      return;
    }


    const namesArray = names.trim().toLowerCase().split(',');
    const from = msg.message.user.name.toLowerCase();
    const room = msg.message.room;
    reason = reason != null ? reason.trim().toLowerCase() : undefined;

    const cleanNames = namesArray
      // Parse names
      .map((name) => {
        name = helper.cleanName(name);
        return name.match(new RegExp(helper.votedObject, 'i'))[1];
      })
      // Remove empty ones: {,,,}++
      .filter((name) => !!name.length)
      // Remove duplicates: {user1,user1}++
      .filter((name, pos, self) => self.indexOf(name) === pos);

    // If after the parse + cleanup of the names there is only one name, ignore it.
    // {user1}++
    if (cleanNames.length === 1) return;

    let messages;
    if (operator === '++') {
      messages = cleanNames.map(async (name) => {
        [ newScore, reasonScore ] = await scoreKeeper.add(name, from, room, reason);
        robot.logger.debug(`clean names map [${name}]: ${newScore}, the reason ${reasonScore}`);
        return getMessageForNewScore(newScore, name, operator, reason, reasonScore);
      })
      .filter((message) => !!message);
    } else if (operator === '--') {
      messages = cleanNames.map(async (name) => {
        [ newScore, reasonScore ] = await scoreKeeper.subtract(name, from, room, reason);
        return getMessageForNewScore(newScore, name, operator, reason, reasonScore);
      })
      .filter((message) => !!message);
    }


    if (messages.length) {
      robot.logger.debug(`These are the messages \n ${messages.join('\n')}`);
      msg.send(messages.join('\n'));
      cleanNames.map((name) => 
        robot.emit("plus-one", {
          name:      name,
          direction: operator,
          room:      room,
          reason:    reason,
          from:      from
        })
      );
    } else {
      msg.reply("please slow your roll.");
      return;
    }
  }

  function respondWithScore(msg) {
    const name = helper.cleanName(msg.match[2]);

    const score = scoreKeeper.scoreForUser(name);
    const reasons = scoreKeeper.reasonsForUser(name);

    if (typeof reasons == 'object' && Object.keys(reasons).length > 0) {
      const reasonMap = _.reduce(reasons, (memo, val, key) => memo += `\n${key}: ${val} points`,``);
      return msg.send(`${name} has ${score} points. Here are some ${reasonsKeyword}: ${reasonMap}`);
    } else {
      return msg.send(`${name} has ${score} points`);
    }
  }

  function tellHowMuchPointsAreWorth(msg) {
    request.get('https://api.coindesk.com/v1/bpi/currentprice/ARS.json', { json: true }, (err, res, body) => {
      var bitcoin = body.bpi.USD.rate_float;
      var ars = body.bpi.ARS.rate_float;
      var satoshi = bitcoin / 1e8;
      return msg.send(`A bitcoin is worth ${bitcoin} USD right now (${ars} ARS), a satoshi is about ${satoshi} and ${msg.message._robot_name} points are worth nothing!`);
    });
  }

  async function respondWithLeaderLoserBoard(msg) {
    const amount = parseInt(msg.match[2]) || 10;
    const topOrBottom = msg.match[1].trim();
    
    const tops = await scoreKeeper[topOrBottom](amount);
    
    let message = [];
    if (tops.length > 0) {
      for (let i = 0, end = tops.length-1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
        message.push(`${i+1}. ${tops[i].name} : ${tops[i].score}`);
      }
    } else {
      message.push("No scores to keep track of yet!");
    }

    if(topOrBottom === "top") {
      const graphSize = Math.min(tops.length, Math.min(amount, 20));
      message.splice(0, 0, clark(_.first(_.pluck(tops, "score"), graphSize)));
    }

    return msg.send(message.join("\n"));
  }

  function eraseUserScore(msg) {
    let erased;
    let [__, name, reason] = Array.from(msg.match);
    const from = msg.message.user.name.toLowerCase();
    const { user } = msg.envelope;
    const { room } = msg.message;
    reason = reason != null ? reason.trim().toLowerCase() : undefined;

    name = helper.cleanName(name);

    const isAdmin = (this.robot.auth ? this.robot.auth.hasRole(user, 'plusplus-admin') : undefined) || (this.robot.auth ? this.robot.auth.hasRole(user, 'admin') : undefined);

    if (!this.robot.auth || !isAdmin) {
      msg.reply("Sorry, you don't have authorization to do that.");      
      return;
    } else if (isAdmin) {
      erased = scoreKeeper.erase(name, from, room, reason);
    }

    if (erased) {
      const message = (reason != null) ? `Erased the following reason from ${name}: ${reason}` : `Erased points for ${name}`;
      msg.send(message);
    }
  } 

  /* ----- private helpers ----- */
  function getMessageForNewScore(score, name, operator, reason, reasonScore) {
    //if we got a score, then display all the things and fire off events!
    if (typeof score !== undefined && score !== null) {
      if (name === 'heat') {
        const upOrDown = operator == '++' ? 'subir' : 'bajar';
        return `podríamos ${upOrDown} un gradin la calefa???\nLa temperatura debería estar en ${score} ℃.`;
      }


      if (reason != null) {
        if ((reasonScore === 1) || (reasonScore === -1)) {
          if ((score === 1) || (score === -1)) {
            return `${name} has ${score} point for ${reason}.`
          } else {
            return `${name} has ${score} points, ${reasonScore} of which is for ${reason}.`
          }
        } else {
          return `${name} has ${score} points, ${reasonScore} of which are for ${reason}.`
        }
      } else {
        if (score === 1) {
          return `${name} has ${score} point`
        } else {
          return `${name} has ${score} points`;
        }
      }
    }
    return;
  }
};
