const moment = require('moment');
const clark = require('clark');
const _ = require('lodash');

const helpers = require('./lib/helpers');
const DatabaseService = require('./lib/services/database');
const regExpCreator = require('./lib/regexpCreator');

module.exports = function plusPlus(robot) {
  const procVars = helpers.getProcessVariables(process.env);
  const databaseService = new DatabaseService({ robot, ...procVars });

  robot.respond(regExpCreator.createAskForScoreRegExp(), respondWithScore);
  robot.respond(regExpCreator.createTopBottomRegExp(), respondWithLeaderLoserBoard);
  robot.respond(regExpCreator.createTopBottomTokenRegExp(), respondWithLeaderLoserTokenBoard);
  robot.respond(regExpCreator.createTopPointGiversRegExp(), getTopPointSenders);
  robot.respond(regExpCreator.createBotDayRegExp(robot.name), respondWithUsersBotDay);

  async function respondWithScore(msg) {
    const { mentions } = msg.message;
    const [fullText, premessage, conjunction, name] = msg.match;
    let to = { name: helpers.cleanName(name) };
    if (mentions) {
      const userMentions = mentions.filter((men) => men.type === 'user');
      to = userMentions.pop();
      to.name = name;
    }

    const user = await databaseService.getUser(to);

    let tokenString = '.';
    if (user.accountLevel > 1) {
      tokenString = ` (*${user.token} ${helpers.capitalizeFirstLetter(robot.name)} `;
      tokenString = tokenString.concat(user.token > 1 ? 'Tokens*).' : 'Token*).');
    }

    const scoreStr = user.score > 1 ? 'points' : 'point';
    let baseString = `<@${user.slackId}> has ${user.score} ${scoreStr}${tokenString}`;
    baseString += `\nAccount Level: ${user.accountLevel}`;
    baseString += `\nTotal Points Given: ${user.totalPointsGiven}`;
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

  async function respondWithLeaderLoserBoard(msg) {
    const amount = parseInt(msg.match[2], 10) || 10;
    const topOrBottom = helpers.capitalizeFirstLetter(msg.match[1].trim());
    const methodName = `get${topOrBottom}Scores`;

    const tops = await databaseService[methodName](amount);
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

    const tops = await databaseService[methodName](amount);

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

  async function getTopPointSenders(msg) {
    const amount = parseInt(msg.match[2], 10) || 10;
    const topOrBottom = helpers.capitalizeFirstLetter(msg.match[1].trim());
    const methodName = `get${topOrBottom}Sender`;
    const tops = await databaseService[methodName](amount);

    const message = [];
    if (tops.length > 0) {
      for (let i = 0, end = tops.length - 1, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
        const person = `<@${tops[i].slackId}>`;
        const pointStr = tops[i].totalPointsGiven > 1 ? 'points given' : 'point given';
        message.push(`${i + 1}. ${person} (${tops[i].totalPointsGiven} ${pointStr})`);
      }
    } else {
      message.push('No scores to keep track of yet!');
    }

    const graphSize = Math.min(tops.length, Math.min(amount, 20));
    message.splice(0, 0, clark(_.take(_.map(tops, 'totalPointsGiven'), graphSize)));

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
    const user = await databaseService.getUser({ name: userToLookup });
    if (isMy) {
      messageName = user.slackId ? `<@${user.slackId}>'s` : `${user.name}'s`;
    }
    const dateObj = new Date(user[`${robot.name}Day`]);
    msg.send(`${messageName} ${robot.name}day is ${moment(dateObj).format('MM-DD-yyyy')}`);
  }
};
