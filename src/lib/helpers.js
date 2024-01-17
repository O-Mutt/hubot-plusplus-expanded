const {
  differenceInYears,
  format,
  getDate,
  isSunday,
  isMonday,
  isTuesday,
  isWednesday,
  isThursday,
  isFriday,
  isSaturday,
  getWeekOfMonth,
  parseISO,
  parse,
} = require('date-fns');
const { rpp } = require('./regExpPlusPlus');

class Helpers {
  static getEsOnEndOfWord(number) {
    if (number === -1 || number === 1) {
      return '';
    }
    return 's';
  }

  static capitalizeFirstLetter(str) {
    if (typeof str !== 'string') {
      return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static decode(str) {
    if (!str) {
      return undefined;
    }

    const buff = Buffer.from(str, 'base64');
    const text = buff.toString('UTF-8');
    return text;
  }

  static isCakeDay(dateObject, robot) {
    try {
      const robotDay = new Date(dateObject);
      const today = new Date();
      if (Helpers.isSameDayOfYear(robotDay, today)) {
        return true;
      }
    } catch (e) {
      if (robot && robot.logger && robot.logger.error) {
        robot.logger.error('There was an error in the isCakeDay function', e);
      } else {
        // eslint-disable-next-line no-console
        console.log('There was an error in the isCakeDay function', e);
      }
    }
    return false;
  }

  static getYearsAsString(dateObj) {
    const robotDay = new Date(dateObj);
    const today = new Date();
    const years = differenceInYears(today, robotDay);
    const lastDigit = years.toString().split('').pop();
    if (years === 0) {
      return '';
    }
    if (lastDigit === '1') {
      return `${years}st `;
    }
    if (lastDigit === '2') {
      return `${years}nd `;
    }
    if (lastDigit === '3') {
      return `${years}rd `;
    }
    return `${years}th `;
  }

  static getMessageForTokenTransfer(robot, to, from, number, reason) {
    if (!to) {
      return '';
    }
    const toTag = to.slackId ? `<@${to.slackId}>` : to.name;
    const fromTag = from.slackId ? `<@${from.slackId}>` : from.name;

    const scoreStr = `${fromTag} transferred *${number}* ${
      robot.name
    } Tokens to ${toTag}.\n${toTag} now has ${
      to.token
    } token${Helpers.getEsOnEndOfWord(to.token)}`;
    let reasonStr = '.';
    let cakeDayStr = '';

    if (reason) {
      const decodedReason = Helpers.decode(reason);
      if (to.reasons[reason] === 1 || to.reasons[reason] === -1) {
        if (to.score === 1 || to.score === -1) {
          reasonStr = ` for ${decodedReason}.`;
        } else {
          reasonStr = `, ${to.reasons[reason]} of which is for ${decodedReason}.`;
        }
      } else if (to.reasons[reason] === 0) {
        reasonStr = `, none of which are for ${decodedReason}.`;
      } else {
        reasonStr = `, ${to.reasons[reason]} of which are for ${decodedReason}.`;
      }
    }

    if (Helpers.isCakeDay(to[`${robot.name}Day`], robot)) {
      const yearsAsString = Helpers.getYearsAsString(to[`${robot.name}Day`]);
      cakeDayStr = `\n:birthday: Today is ${toTag}'s ${yearsAsString}${robot.name}day! :birthday:`;
    }
    return `${scoreStr}${reasonStr}${cakeDayStr}\n_${fromTag} has ${
      from.token
    } token${Helpers.getEsOnEndOfWord(from.token)}_`;
  }

  /**
   * @param {string} name - The name to clean
   * @returns {string} - The cleaned name
   * @static
   *
   */
  static cleanName(name) {
    if (name) {
      let trimmedName = name.trim().toLowerCase();
      if (trimmedName.charAt(0) === ':') {
        trimmedName = trimmedName.replace(/(^\s*['"@])|([,'"\s]*$)/gi, '');
      } else {
        trimmedName = trimmedName.replace(/(^\s*['"@])|([,:'"\s]*$)/gi, '');
      }
      return trimmedName;
    }
    return name;
  }

  /**
   * @param {string} str - The string to clean and encode
   * @returns {string} - The cleaned and encoded string
   * @static
   */
  static cleanAndEncode(str) {
    if (!str) {
      return undefined;
    }

    // this should fix a dumb issue with mac quotes
    const trimmed = JSON.parse(JSON.stringify(str.trim().toLowerCase()));
    const buff = Buffer.from(trimmed);
    const base64data = buff.toString('base64');
    return base64data;
  }

  /*
   * Checks if the room is a private message
   * @param {string} room - The room to check
   * @returns {boolean} - True if the room is a private message
   * @static
   *
   */
  static isPrivateMessage(room) {
    // "Shell" is the adapter for running in the terminal
    return room[0] === 'D' || room === 'Shell';
  }

  static isKnownFalsePositive(premessage, conjunction, reason, operator) {
    const falsePositive =
      premessage &&
      !conjunction &&
      reason &&
      new RegExp(rpp.negativeOperators).test(operator);
    return falsePositive;
  }

  static getProcessVars = Helpers.getProcessVariables;

  static getProcessVariables(env) {
    const procVars = {};
    procVars.reasonsKeyword = env.HUBOT_PLUSPLUS_REASONS || 'reasons';
    procVars.spamMessage =
      env.HUBOT_SPAM_MESSAGE ||
      'Looks like you hit the spam filter. Please slow your roll.';
    procVars.spamTimeLimit = parseInt(env.SPAM_TIME_LIMIT, 10) || 5;
    procVars.companyName = env.HUBOT_COMPANY_NAME || 'Company Name';

    procVars.furtherFeedbackSuggestedScore =
      parseInt(env.HUBOT_FURTHER_FEEDBACK_SCORE, 10) || 10;
    procVars.mongoUri =
      env.MONGODB_URI ||
      env.MONGO_URI ||
      env.MONGODB_URL ||
      env.MONGOLAB_URI ||
      env.MONGOHQ_URL ||
      'mongodb://localhost/plusPlus';
    procVars.cryptoRpcProvider = env.HUBOT_CRYPTO_RPC_PROVIDER || '';
    procVars.magicNumber = env.HUBOT_UNIMPORTANT_MAGIC_NUMBER || 'nope';
    procVars.magicIv = env.HUBOT_UNIMPORTANT_MAGIC_IV || 'yup';
    procVars.furtherHelpUrl = env.HUBOT_CRYPTO_FURTHER_HELP_URL || undefined;
    procVars.notificationsRoom =
      env.HUBOT_PLUSPLUS_NOTIFICATION_ROOM || undefined;
    procVars.falsePositiveNotificationsRoom =
      env.HUBOT_PLUSPLUS_FALSE_POSITIVE_NOTIFICATION_ROOM || undefined;
    procVars.monthlyScoreboardCron =
      env.HUBOT_PLUSPLUS_MONTHLY_SCOREBOARD_CRON || '0 10 1-7 * *';
    procVars.monthlyScoreboardDayOfWeek =
      parseInt(env.HUBOT_PLUSPLUS_MONTHLY_SCOREBOARD_DAY_OF_WEEK, 10) || 1; // 0-6 (Sun - Sat)

    // Dependent on other procVars
    procVars.peerFeedbackUrl =
      env.HUBOT_PEER_FEEDBACK_URL ||
      `praise in Lattice (https://${procVars.companyName}.latticehq.com/)`;

    return procVars;
  }

  static isA1Day() {
    const isDay = format(new Date(), 'dM');
    if (isDay === '14') {
      return true;
    }
    return false;
  }

  /**
   * Checks if the current day of the week is the same as the configured day of the week
   * @param {Object} robot - Hubot robot object
   * @param {Number} monthlyScoreboardDayOfWeek - The day of the week to run the cron on
   * @returns {Boolean} - True if the current day of the week is the same as the configured day of the week
   * @static
   * @example
   * const isScoreboardDay = Helpers.isScoreboardDayOfWeek(robot, monthlyScoreboardDayOfWeek);
   * if (isScoreboardDay) {
   *  // Do something
   * }
   */
  static isScoreboardDayOfWeek(robot, monthlyScoreboardDayOfWeek) {
    const today = new Date();
    let isScoreboardDay = false;
    // Only run the cron on the first week of the month
    if (getWeekOfMonth(today) === 1) {
      // Check if the day of the week is the same as the configured day of the week
      switch (monthlyScoreboardDayOfWeek) {
        case 0:
          isScoreboardDay = isSunday(today);
          break;
        case 1:
          isScoreboardDay = isMonday(today);
          break;
        case 2:
          isScoreboardDay = isTuesday(today);
          break;
        case 3:
          isScoreboardDay = isWednesday(today);
          break;
        case 4:
          isScoreboardDay = isThursday(today);
          break;
        case 5:
          isScoreboardDay = isFriday(today);
          break;
        case 6:
          isScoreboardDay = isSaturday(today);
          break;
        default:
          isScoreboardDay = false;
      }
    }
    robot.logger.debug(
      `Run the cron but lets check what day it is Moment day: [${getDate(
        today,
      )}], Configured Day of Week: [${monthlyScoreboardDayOfWeek}], isThatDay: [${
        getDate(today) === monthlyScoreboardDayOfWeek
      }]`,
    );
    return isScoreboardDay;
  }

  static getDayOfYear(date) {
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  static isSameDayOfYear(date1, date2) {
    return Helpers.getDayOfYear(date1) === Helpers.getDayOfYear(date2);
  }

  /**
   * @param {string} dateStr - The date string to parse
   * @param {object?} robot - The robot object
   * @returns {object} - The parsed date object
   * @static
   */
  static parseDateStrAndFormat(dateStr, robot, formatStr = 'MMM. do yyyy') {
    if (!dateStr) {
      return 'unknown';
    }

    try {
      // 2018-10-01T16:55:04.000Z
      const date = parseISO(dateStr);
      return format(date, formatStr);
    } catch (e) {
      // Mon Oct 01 2018 16:55:04 GMT+0000 (Coordinated Universal Time)
      try {
        const date = parse(dateStr, 'EEE MMM dd yyyy HH:mm:ss', new Date());
        return format(date, formatStr);
      } catch (e2) {
        try {
          // who tf knows what this is
          const date = new Date(dateStr);
          return format(date, formatStr);
        } catch (e3) {
          if (robot && robot.logger) {
            robot.logger.error('Failed to parse date string', dateStr);
          }
          return 'unknown';
        }
      }
    }
  }
}

module.exports = Helpers;
module.exports.H = Helpers;
module.exports.Helpers = Helpers;
module.exports.h = Helpers;
