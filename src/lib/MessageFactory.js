const { format, parseISO, toDate, parseJSON, parse } = require('date-fns');
const _ = require('lodash');

const Helpers = require('./Helpers');
const { upsideDownChars, nonSequiturs } = require('./static/a1');

module.exports = class MessageFactory {
  /**
   * Builds a message for the user's score
   * @param {object} user - The user object
   * @param {string} robotName - The name of the robot
   * @param {object} procVars - The process variables
   * @returns {string} - The message
   * @memberof MessageFactory
   * @static
   */
  static BuildScoreLookup(user, robotName, procVars) {
    if (_.isEmpty(user) || _.isEmpty(robotName) || _.isEmpty(procVars)) return '';
    let tokenString = '.';
    if (user.accountLevel > 1) {
      tokenString = ` (*${user.token} ${Helpers.capitalizeFirstLetter(robotName)} `;
      tokenString = tokenString.concat(user.token > 1 ? 'Tokens*).' : 'Token*).');
    }

    const scoreStr = user.score === 1 || user.score === -1 ? 'point' : 'points';
    let baseString = `<@${user.slackId}> has ${user.score} ${scoreStr}${tokenString}`;
    baseString += `\nAccount Level: ${user.accountLevel}`;
    baseString += `\nTotal Points Given: ${user.totalPointsGiven}`;

    if (user[`${robotName}Day`]) {
      const dateObj = parseISO(user[`${robotName}Day`]);
      baseString += `\n:birthday: ${Helpers.capitalizeFirstLetter(robotName)}day is ${format(dateObj, 'MMM. do yyyy')}`;
    }
    const keys = Object.keys(user.reasons || {});
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
        const decodedKey = Helpers.decode(key);
        const pointStr = val > 1 ? 'points' : 'point';
        memo += `\n_${decodedKey}_: ${val} ${pointStr}`;
        return memo;
      }, '');

      return `${baseString}\n\n:star: Here are some ${procVars.reasonsKeyword} :star:${reasonMap}`;
    }

    return baseString;
  }

  /**
   * Builds a message for the user's score
   * @param {object} user - The user object
   * @param {string} reason - The reason for the score
   * @param {string} robotName - The name of the robot
   * @returns {string} - The message
   * @memberof MessageFactory
   * @static
   */
  static BuildNewScoreMessage(user, reason, robotName) {
    if (!user) {
      return '';
    }
    const username = user.slackId ? `<@${user.slackId}>` : user.name;
    let scoreStr = `${username} has ${user.score} point${Helpers.getEsOnEndOfWord(user.score)}`;
    let reasonStr = '.';
    let cakeDayStr = '';

    if (user.score % 100 === 0) {
      let scoreFlareStr = (user.score).toString();
      if (user.score === 0) {
        scoreFlareStr = 'zero';
      }
      const extraFlare = `:${scoreFlareStr}:`;
      scoreStr = `${extraFlare} ${scoreStr} ${extraFlare}`;
      reasonStr = '';
    }

    if (user.accountLevel && user.accountLevel > 1) {
      let tokenStr = `(*${user.token} ${Helpers.capitalizeFirstLetter(robotName)} Tokens*)`;
      if (user.token === 1) {
        tokenStr = `(*${user.token} ${Helpers.capitalizeFirstLetter(robotName)} Token*)`;
      }
      scoreStr = scoreStr.concat(` ${tokenStr}`);
    }

    if (reason) {
      const decodedReason = Helpers.decode(reason);
      if (user.reasons[reason] === 1 || user.reasons[reason] === -1) {
        if (user.score === 1 || user.score === -1) {
          reasonStr = ` for ${decodedReason}.`;
        } else {
          reasonStr = `, ${user.reasons[reason]} of which is for ${decodedReason}.`;
        }
      } else if (user.reasons[reason] === 0) {
        reasonStr = `, none of which are for ${decodedReason}.`;
      } else {
        reasonStr = `, ${user.reasons[reason]} of which are for ${decodedReason}.`;
      }
    }

    if (Helpers.isCakeDay(user[`${robotName}Day`])) {
      const yearsAsString = Helpers.getYearsAsString(user[`${robotName}Day`]);
      cakeDayStr = `\n:birthday: Today is ${username}'s ${yearsAsString}${robotName}day! :birthday:`;
    }

    let normalMessage = `${scoreStr}${reasonStr}${cakeDayStr}`;
    if (Helpers.isA1Day()) {
      normalMessage = MessageFactory.GetA1DayMessage(normalMessage, robotName);
    }

    return normalMessage;
  }

  /**
   * Builds a message for the user's score
   * @param {object} user - The user object
   * @param {string} reason - The reason for the score
   * @param {string} robotName - The name of the robot
   * @returns {string} - The message
   * @memberof MessageFactory
   * @static
   */
  static GetA1DayMessage(originalMessage, robotName, randomIndex = Math.floor(Math.random() * 7), force = false) {
    const a0opt = [
      (message) => message.replace(/[aeiouy]/ig, '').replace('  ', ' '),
      (message) => {
        const alpha = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLM';
        return message.replace(/[a-z]/gi, (letter) => alpha[alpha.indexOf(letter) + 13]);
      },
      () => `I'm ${robotName}. Not a mind reader!`,
      () => "That's classified information, I'm afraid I cannot disclose that.",
      (message) => {
        for (let i = 0; i < message.length; i++) {
          const randomCase = Math.random() < 0.5 ? 'toUpperCase' : 'toLowerCase';
          message = message.substr(0, i) + message[i][randomCase]() + message.substr(i + 1);
        }
        return message;
      },
      (message) => {
        const words = message.split(' ');
        for (let i = 0; i < words.length; i++) {
          const randomNonSequitur = nonSequiturs[Math.floor(Math.random() * nonSequiturs.length)];
          if (Math.random() < 0.1 || force) {
            words[i] += ` ${randomNonSequitur}`;
          }
        }
        return words.join(' ');
      },
      (message) => {
        const words = message.split(' ');
        for (let i = 0; i < words.length; i++) {
          if (Math.random() < 0.13 || force) {
            const randomWord = Math.floor(Math.random() * message.length);
            const randomChar = String.fromCharCode(Math.floor(Math.random() * 26) + 97);
            message = message.slice(0, randomWord) + randomChar + message.slice(randomWord + 1);
          }
        }
        return message;
      },
      (message) => {
        const charArray = message.split('');
        const reversed = charArray.reverse();
        const flippedChars = reversed.map((c) => upsideDownChars[c]);
        return flippedChars.join('');
      },
    ];
    if (randomIndex > a0opt.length || !a0opt[randomIndex]) return originalMessage;
    const rand = a0opt[randomIndex];
    return rand(originalMessage);
  }
};
