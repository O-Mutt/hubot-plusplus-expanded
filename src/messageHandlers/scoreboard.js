// Description:
//  Hubot scoreboard for hubot-plusplus-expanded.
//
// Commands:
//  @hubot score @<name> - Display the score for a name and some of the reasons
//  @hubot top <amount> - Display the top scoring <amount>
//  @hubot bottom <amount> - Display the bottom scoring <amount>
//
// Author:
//  O'Mutt (Matt@OKeefe.dev)

const clark = require('clark');
const _ = require('lodash');

const Helpers = require('../lib/Helpers');
const DatabaseService = require('../lib/services/database');
const { RegExpPlusPlus } = require('../lib/RegExpPlusPlus');
const MessageFactory = require('../lib/MessageFactory');

module.exports = function scoreboard(robot) {
  const procVars = Helpers.getProcessVariables(process.env);
  const databaseService = new DatabaseService({ robot, ...procVars });

  robot.respond(RegExpPlusPlus.createAskForScoreRegExp(), respondWithScore);
  robot.respond(
    RegExpPlusPlus.createTopBottomRegExp(),
    respondWithLeaderLoserBoard,
  );
  robot.respond(
    RegExpPlusPlus.createTopBottomTokenRegExp(),
    respondWithLeaderLoserTokenBoard,
  );
  robot.respond(
    RegExpPlusPlus.createTopPointGiversRegExp(),
    getTopPointSenders,
  );

  async function respondWithScore(msg) {
    const { mentions } = msg.message;
    const [fullText, premessage, conjunction, name] = msg.match;
    let to = { name: Helpers.cleanName(name) };
    if (mentions) {
      const userMentions = mentions.filter((men) => men.type === 'user');
      to = userMentions.pop();
      to.name = name;
    }

    const user = await databaseService.getUser(to);

    const scoreString = MessageFactory.BuildScoreLookup(user, robot, procVars);
    msg.send(scoreString);
  }

  async function respondWithLeaderLoserBoard(msg) {
    const amount = parseInt(msg.match[2], 10) || 10;
    const topOrBottom = Helpers.capitalizeFirstLetter(msg.match[1].trim());
    const methodName = `get${topOrBottom}Scores`;

    const tops = await databaseService[methodName](amount);
    const message = [];
    if (tops.length > 0) {
      for (
        let i = 0, end = tops.length - 1, asc = end >= 0;
        asc ? i <= end : i >= end;
        asc ? i++ : i--
      ) {
        const person = tops[i].slackId ? `<@${tops[i].slackId}>` : tops[i].name;
        if (tops[i].accountLevel && tops[i].accountLevel > 1) {
          const tokenStr = tops[i].token > 1 ? 'Tokens' : 'Token';
          message.push(
            `${i + 1}. ${person}: ${tops[i].score} (*${
              tops[i].token
            } ${Helpers.capitalizeFirstLetter(this.robot.name)} ${tokenStr}*)`,
          );
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
    const topOrBottom = Helpers.capitalizeFirstLetter(msg.match[1].trim());
    const methodName = `get${topOrBottom}Tokens`;

    const tops = await databaseService[methodName](amount);

    const message = [];
    if (tops.length > 0) {
      for (
        let i = 0, end = tops.length - 1, asc = end >= 0;
        asc ? i <= end : i >= end;
        asc ? i++ : i--
      ) {
        const person = tops[i].slackId ? `<@${tops[i].slackId}>` : tops[i].name;
        const tokenStr = tops[i].token > 1 ? 'Tokens' : 'Token';
        const pointStr = tops[i].score > 1 ? 'points' : 'point';
        message.push(
          `${i + 1}. ${person}: *${
            tops[i].token
          } ${Helpers.capitalizeFirstLetter(this.robot.name)} ${tokenStr}* (${
            tops[i].score
          } ${pointStr})`,
        );
      }
    } else {
      message.push('No scores to keep track of yet!');
    }

    const graphSize = Math.min(tops.length, Math.min(amount, 20));
    message.splice(0, 0, clark(_.take(_.map(tops, 'token'), graphSize)));

    return msg.send(message.join('\n'));
  }

  async function getTopPointSenders(msg) {
    const amount = parseInt(msg.match[2], 10) || 10;
    const topOrBottom = Helpers.capitalizeFirstLetter(msg.match[1].trim());
    const methodName = `get${topOrBottom}Sender`;
    const tops = await databaseService[methodName](amount);

    const message = [];
    if (tops.length > 0) {
      for (
        let i = 0, end = tops.length - 1, asc = end >= 0;
        asc ? i <= end : i >= end;
        asc ? i++ : i--
      ) {
        const person = `<@${tops[i].slackId}>`;
        const pointStr =
          tops[i].totalPointsGiven > 1 ? 'points given' : 'point given';
        message.push(
          `${i + 1}. ${person} (${tops[i].totalPointsGiven} ${pointStr})`,
        );
      }
    } else {
      message.push('No scores to keep track of yet!');
    }

    const graphSize = Math.min(tops.length, Math.min(amount, 20));
    message.splice(
      0,
      0,
      clark(_.take(_.map(tops, 'totalPointsGiven'), graphSize)),
    );

    return msg.send(message.join('\n'));
  }
};
