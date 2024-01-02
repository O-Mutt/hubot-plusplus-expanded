const clark = require('clark');
const _ = require('lodash');
const { H } = require('../helpers');
const { mfs } = require('../messageFactory');
const { dbs } = require('./database');

class ScoreboardService {
  static async respondWithScore(msg) {
    const { mentions } = msg.message;
    const [_fullText, _premessage, _conjunction, name] = msg.match;
    let to = { name: H.cleanName(name) };
    if (mentions) {
      const userMentions = mentions.filter((men) => men.type === 'user');
      to = userMentions.pop();
      to.name = name;
    }

    const user = await dbs.getUser(msg.robot, to);

    const scoreString = mfs.BuildScoreLookup(msg.robot, user);
    msg.send(scoreString);
  }

  static async respondWithLeaderLoserBoard(msg) {
    const amount = parseInt(msg.match[2], 10) || 10;

    const topOrBottom = H.capitalizeFirstLetter(msg.match[1].trim());
    const methodName = `get${topOrBottom}Scores`;

    const tops = await dbs[methodName](msg.robot, amount);
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
            } ${H.capitalizeFirstLetter(msg.robot.name)} ${tokenStr}*)`,
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

  static async respondWithLeaderLoserTokenBoard(msg) {
    const amount = parseInt(msg.match[2], 10) || 10;
    const topOrBottom = H.capitalizeFirstLetter(msg.match[1].trim());
    const methodName = `get${topOrBottom}Tokens`;

    const tops = await dbs[methodName](msg.robot, amount);

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
          `${i + 1}. ${person}: *${tops[i].token} ${H.capitalizeFirstLetter(
            msg.robot.name,
          )} ${tokenStr}* (${tops[i].score} ${pointStr})`,
        );
      }
    } else {
      message.push('No scores to keep track of yet!');
    }

    const graphSize = Math.min(tops.length, Math.min(amount, 20));
    message.splice(0, 0, clark(_.take(_.map(tops, 'token'), graphSize)));

    return msg.send(message.join('\n'));
  }

  static async getTopPointSenders(msg) {
    const amount = parseInt(msg.match[2], 10) || 10;
    const topOrBottom = H.capitalizeFirstLetter(msg.match[1].trim());
    const methodName = `get${topOrBottom}Sender`;
    const tops = await dbs[methodName](msg.robot, amount);

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
}

module.exports = ScoreboardService;
module.exports.sbs = ScoreboardService;
