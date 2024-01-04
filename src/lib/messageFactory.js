const { format, parseISO } = require('date-fns');
const _ = require('lodash');

const { H } = require('./helpers');
const { upsideDownChars, nonSequiturs } = require('./static/a1');

class MessageFactory {
  /**
   * Builds a message for the user's score
   * @param {object} user - The user object
   * @returns {string} - The message
   * @memberof MessageFactory
   * @static
   */
  static BuildScoreLookup(robot, user) {
    const robotName = robot.name;
    const pVars = H.getProcessVariables(process.env);
    if (_.isEmpty(user) || _.isEmpty(pVars)) return '';
    let tokenString = '.';
    if (user.accountLevel > 1) {
      tokenString = ` (*${user.token} ${H.capitalizeFirstLetter(robotName)} `;
      tokenString = tokenString.concat(
        user.token > 1 ? 'Tokens*).' : 'Token*).',
      );
    }

    const scoreStr = user.score === 1 || user.score === -1 ? 'point' : 'points';
    let baseString = `<@${user.slackId}> has ${user.score} ${scoreStr}${tokenString}`;
    baseString += `\nAccount Level: ${user.accountLevel}`;
    baseString += `\nTotal Points Given: ${user.totalPointsGiven}`;

    if (user[`${robotName}Day`]) {
      try {
        const dateObj = parseISO(user[`${robotName}Day`]);
        baseString += `\n:birthday: ${H.capitalizeFirstLetter(
          robotName,
        )}day is ${format(dateObj, 'MMM. do yyyy')}`;
      } catch (e) {
        robot.logger.error(
          `Robot day failed to be parsed: ${robotName}, ${
            user[`${robotName}Day`]
          }`,
          e,
        );
      }
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

      const reasonMap = _.reduce(
        sampleReasons,
        (memo, val, key) => {
          const decodedKey = H.decode(key);
          const pointStr = val > 1 ? 'points' : 'point';
          return `${memo}\n_${decodedKey}_: ${val} ${pointStr}`;
        },
        '',
      );

      return `${baseString}\n\n:star: Here are some ${pVars.reasonsKeyword} :star:${reasonMap}`;
    }

    return baseString;
  }

  /**
   * Builds a message for the user's score
   * @param {object} user - The user object
   * @param {string} reason - The reason for the score
   * @returns {string} - The message
   * @memberof MessageFactory
   * @static
   */
  static BuildNewScoreMessage(robot, user, reason) {
    const robotName = robot.name;
    if (!user) {
      return '';
    }
    const username = user.slackId ? `<@${user.slackId}>` : user.name;
    let scoreStr = `${username} has ${user.score} point${H.getEsOnEndOfWord(
      user.score,
    )}`;
    let reasonStr = '';
    let cakeDayStr = '';

    if (user.score % 100 === 0) {
      let scoreFlareStr = user.score.toString();
      if (user.score === 0) {
        scoreFlareStr = 'zero';
      }
      const extraFlare = `:${scoreFlareStr}:`;
      scoreStr = `${extraFlare} ${scoreStr} ${extraFlare}`;
      reasonStr = '';
    }

    if (user.accountLevel && user.accountLevel > 1) {
      let tokenStr = `(*${user.token} ${H.capitalizeFirstLetter(
        robotName,
      )} Tokens*)`;
      if (user.token === 1) {
        tokenStr = `(*${user.token} ${H.capitalizeFirstLetter(
          robotName,
        )} Token*)`;
      }
      scoreStr = scoreStr.concat(` ${tokenStr}`);
    }

    if (reason) {
      const decodedReason = H.decode(reason);
      if (user.reasons[reason] === 1 || user.reasons[reason] === -1) {
        if (user.score === 1 || user.score === -1) {
          reasonStr = ` for ${decodedReason}`;
        } else {
          reasonStr = `, ${user.reasons[reason]} of which is for ${decodedReason}`;
        }
      } else if (user.reasons[reason] === 0) {
        reasonStr = `, none of which are for ${decodedReason}`;
      } else {
        reasonStr = `, ${user.reasons[reason]} of which are for ${decodedReason}`;
      }
    }

    if (H.isCakeDay(user[`${robotName}Day`])) {
      const yearsAsString = H.getYearsAsString(user[`${robotName}Day`]);
      cakeDayStr = `\n:birthday: Today is ${username}'s ${yearsAsString}${robotName}day! :birthday:`;
    }

    if (
      (!reasonStr && !/[.,;?!:]$/.test(scoreStr)) ||
      (reasonStr && !/[.,;?!:]$/.test(reasonStr))
    ) {
      reasonStr += '.';
    }
    let normalMessage = `${scoreStr}${reasonStr}${cakeDayStr}`;
    if (H.isA1Day()) {
      normalMessage = MessageFactory.GetA1DayMessage(robot, normalMessage);
    }

    return normalMessage;
  }

  /**
   * Builds a message for the user's score
   * @param {object} robot - The robot object
   * @param {object} user - The user object
   * @param {string} reason - The reason for the score
   * @returns {string} - The message
   * @memberof MessageFactory
   * @static
   */
  static GetA1DayMessage(
    robot,
    originalMessage,
    randomIndex = Math.floor(Math.random() * 7),
    force = false,
  ) {
    const a0opt = [
      (message) => message.replace(/[aeiouy]/gi, '').replace('  ', ' '),
      (message) => {
        const alpha =
          'abcdefghijklmnopqrstuvwxyzabcdefghijklmABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLM';
        return message.replace(
          /[a-z]/gi,
          (letter) => alpha[alpha.indexOf(letter) + 13],
        );
      },
      () => `I'm ${robot.name}. Not a mind reader!`,
      () => "That's classified information, I'm afraid I cannot disclose that.",
      (message) => {
        let newMessage = message;
        for (let i = 0; i < message.length; i++) {
          const randomCase =
            Math.random() < 0.5 ? 'toUpperCase' : 'toLowerCase';
          newMessage =
            newMessage.substr(0, i) +
            newMessage[i][randomCase]() +
            newMessage.substr(i + 1);
        }
        return newMessage;
      },
      (message) => {
        const words = message.split(' ');
        for (let i = 0; i < words.length; i++) {
          const randomNonSequitur =
            nonSequiturs[Math.floor(Math.random() * nonSequiturs.length)];
          if (Math.random() < 0.1 || force) {
            words[i] += ` ${randomNonSequitur}`;
          }
        }
        return words.join(' ');
      },
      (message) => {
        let newMessage = message;
        const words = newMessage.split(' ');
        for (let i = 0; i < words.length; i++) {
          if (Math.random() < 0.13 || force) {
            const randomWord = Math.floor(Math.random() * newMessage.length);
            const randomChar = String.fromCharCode(
              Math.floor(Math.random() * 26) + 97,
            );
            newMessage =
              newMessage.slice(0, randomWord) +
              randomChar +
              newMessage.slice(randomWord + 1);
          }
        }
        return newMessage;
      },
      (message) => {
        const charArray = message.split('');
        const reversed = charArray.reverse();
        const flippedChars = reversed.map((c) => upsideDownChars[c]);
        return flippedChars.join('');
      },
    ];
    if (randomIndex > a0opt.length || !a0opt[randomIndex])
      return originalMessage;
    const rand = a0opt[randomIndex];
    return rand(originalMessage);
  }
}

module.exports = MessageFactory;
module.exports.mfs = MessageFactory;
