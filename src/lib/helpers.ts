import { differenceInDays } from 'date-fns';
import { ConfigurationSchema } from '../config';
import Hubot from 'hubot';

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
const { rpp } = require('./matchers/messageMatchers');

// TODO move this to a string/number prototype
export function getPluralSuffix(number) {
  if (number === -1 || number === 1) {
    return '';
  }
  return 's';
}

// TODO move this to a string prototype
export function capitalizeFirstLetter(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function decode(str) {
  if (!str) {
    return undefined;
  }

  const buff = Buffer.from(str, 'base64');
  const text = buff.toString('UTF-8');
  return text;
}

export function isCakeDay(dateObject, robot) {
  try {
    const robotDay = new Date(dateObject);
    const today = new Date();
    if (isSameDayOfYear(robotDay, today)) {
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

export function getYearsAsString(dateObj) {
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

export function getMessageForTokenTransfer(
  robot: Hubot.Robot,
  to,
  from,
  number,
  reason,
) {
  if (!to) {
    return '';
  }
  const toTag = to.slackId ? `<@${to.slackId}>` : to.name;
  const fromTag = from.slackId ? `<@${from.slackId}>` : from.name;

  const scoreStr = `${fromTag} transferred *${number}* ${
    robot.name
  } Tokens to ${toTag}.\n${toTag} now has ${to.token} token${getPluralSuffix(
    to.token,
  )}`;
  let reasonStr = '.';
  let cakeDayStr = '';

  if (reason) {
    const decodedReason = decode(reason);
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

  if (isCakeDay(to[`${robot.name}Day`], robot)) {
    const yearsAsString = getYearsAsString(to[`${robot.name}Day`]);
    cakeDayStr = `\n:birthday: Today is ${toTag}'s ${yearsAsString}${robot.name}day! :birthday:`;
  }
  return `${scoreStr}${reasonStr}${cakeDayStr}\n_${fromTag} has ${
    from.token
  } token${getPluralSuffix(from.token)}_`;
}

/**
 * @param {string} name - The name to clean
 * @returns {string} - The cleaned name
 * @static
 *
 */
export function cleanName(name: string | null) {
  if (!name) {
    return undefined;
  }
  let trimmedName = name.trim().toLowerCase();
  if (trimmedName.charAt(0) === ':') {
    trimmedName = trimmedName.replace(/(^\s*['"@])|([,'"\s]*$)/gi, '');
  } else {
    trimmedName = trimmedName.replace(/(^\s*['"@])|([,:'"\s]*$)/gi, '');
  }
  return trimmedName;
}

/**
 * @param {string} str - The string to clean and encode
 * @returns {string} - The cleaned and encoded string
 * @static
 */
export function cleanAndEncode(str: string | null) {
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
export function isPrivateMessage(room: string | string[]) {
  // "Shell" is the adapter for running in the terminal
  return room[0] === 'D' || room === 'Shell';
}

export function isKnownFalsePositive(
  premessage,
  conjunction,
  reason,
  operator,
) {
  const falsePositive =
    premessage &&
    !conjunction &&
    reason &&
    new RegExp(rpp.negativeOperators).test(operator);
  return falsePositive;
}

export function isA1Day() {
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
 * const isScoreboardDay = isScoreboardDayOfWeek(robot, monthlyScoreboardDayOfWeek);
 * if (isScoreboardDay) {
 *  // Do something
 * }
 */
export function isScoreboardDayOfWeek(
  robot: Hubot.Robot,
  monthlyScoreboardDayOfWeek: ConfigurationSchema['monthlyScoreboardDayOfWeek'],
) {
  const today = new Date();
  // Only run the cron on the first week of the month
  if (getWeekOfMonth(today) !== 1) {
    return false;
  }

  let isDayToRunScoreboard = false;
  // Check if the day of the week is the same as the configured day of the week
  switch (monthlyScoreboardDayOfWeek) {
    case 0:
      isDayToRunScoreboard = isSunday(today);
      break;
    case 1:
      isDayToRunScoreboard = isMonday(today);
      break;
    case 2:
      isDayToRunScoreboard = isTuesday(today);
      break;
    case 3:
      isDayToRunScoreboard = isWednesday(today);
      break;
    case 4:
      isDayToRunScoreboard = isThursday(today);
      break;
    case 5:
      isDayToRunScoreboard = isFriday(today);
      break;
    case 6:
      isDayToRunScoreboard = isSaturday(today);
      break;
    default:
      isDayToRunScoreboard = false;
  }

  robot.logger.debug(
    `Run the cron but lets check what day it is Moment day: [${getDate(
      today,
    )}], Configured Day of Week: [${monthlyScoreboardDayOfWeek}], isThatDay: [${
      getDate(today) === monthlyScoreboardDayOfWeek
    }]`,
  );
  return isDayToRunScoreboard;
}

export function getDayOfYear(date: Date) {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = differenceInDays(date, startOfYear);
  return Math.floor(diff);
}

export function isSameDayOfYear(date1: Date, date2: Date) {
  return getDayOfYear(date1) === getDayOfYear(date2);
}

/**
 * @param {string} dateStr - The date string to parse
 * @param {object?} robot - The robot object
 * @returns {object} - The parsed date object
 * @static
 */
export function parseDateStrAndFormat(
  dateStr: string | Date | null | undefined,
  robot: any | null | undefined,
  formatStr = 'MMM. do yyyy',
) {
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
