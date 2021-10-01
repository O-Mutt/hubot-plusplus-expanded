const moment = require('moment');
const regExpCreator = require('./regexpCreator');

function getEsOnEndOfWord(number) {
  if (number === -1 || number === 1) {
    return '';
  }
  return 's';
}

function capitalizeFirstLetter(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function decode(str) {
  if (!str) {
    return undefined;
  }

  const buff = new Buffer.from(str, 'base64');
  const text = buff.toString('UTF-8');
  return text;
}

function isCakeDay(dateObject, robot) {
  try {
    const robotDay = moment(dateObject);
    const today = moment();
    if (robotDay.date() === today.date() && robotDay.month() === today.month()) {
      return true;
    }
  } catch (e) {
    robot.logger.debug('There was an error in the isCakeDay function', e);
  }
  return false;
}

function getYearsAsString(dateObj) {
  const robotDay = new Date(dateObj);
  const today = new Date();
  const years = today.getFullYear() - robotDay.getFullYear();
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

function getMessageForNewScore(user, reason, robot) {
  if (!user) {
    return '';
  }
  const username = user.slackId ? `<@${user.slackId}>` : user.name;
  let scoreStr = `${username} has ${user.score} point${getEsOnEndOfWord(user.score)}`;
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
    let tokenStr = `(*${user.token} ${capitalizeFirstLetter(robot.name)} Tokens*)`;
    if (user.token === 1) {
      tokenStr = `(*${user.token} ${capitalizeFirstLetter(robot.name)} Token*)`;
    }
    scoreStr = scoreStr.concat(` ${tokenStr}`);
  }

  if (reason) {
    const decodedReason = decode(reason);
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

  if (isCakeDay(user[`${robot.name}Day`])) {
    const yearsAsString = getYearsAsString(user[`${robot.name}Day`]);
    cakeDayStr = `\n:birthday: Today is ${username}'s ${yearsAsString}${robot.name}day! :birthday:`;
  }
  return `${scoreStr}${reasonStr}${cakeDayStr}`;
}

function getMessageForTokenTransfer(robot, to, from, number, reason) {
  if (!to) {
    return '';
  }
  const toTag = to.slackId ? `<@${to.slackId}>` : to.name;
  const fromTag = from.slackId ? `<@${from.slackId}>` : from.name;

  const scoreStr = `${fromTag} transferred *${number}* ${robot.name} Tokens to ${toTag}.\n${toTag} now has ${to.token} token${getEsOnEndOfWord(to.token)}`;
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
  return `${scoreStr}${reasonStr}${cakeDayStr}\n_${fromTag} has ${from.token} token${getEsOnEndOfWord(from.token)}_`;
}

function cleanName(name) {
  if (name) {
    let trimmedName = name.trim().toLowerCase();
    if (trimmedName.charAt(0) === ':') {
      trimmedName = (trimmedName.replace(/(^\s*['"@])|([,'"\s]*$)/gi, ''));
    } else {
      trimmedName = (trimmedName.replace(/(^\s*['"@])|([,:'"\s]*$)/gi, ''));
    }
    return trimmedName;
  }
  return name;
}

function cleanAndEncode(str) {
  if (!str) {
    return undefined;
  }

  // this should fix a dumb issue with mac quotes
  const trimmed = JSON.parse(JSON.stringify(str.trim().toLowerCase()));
  const buff = new Buffer.from(trimmed);
  const base64data = buff.toString('base64');
  return base64data;
}

/*
* checks if the message is in DM
* room - {string} name of the room
*/
function isPrivateMessage(room) {
  // "Shell" is the adapter for running in the terminal
  return room[0] === 'D' || room === 'Shell';
}

function isKnownFalsePositive(premessage, conjunction, reason, operator) {
  const falsePositive = premessage && !conjunction && reason && operator.match(regExpCreator.negativeOperators);
  return falsePositive;
}

function getProcessVariables(env) {
  const procVars = {};
  procVars.reasonsKeyword = env.HUBOT_PLUSPLUS_REASONS || 'reasons';
  procVars.spamMessage = env.HUBOT_SPAM_MESSAGE || 'Looks like you hit the spam filter. Please slow your roll.';
  procVars.spamTimeLimit = parseInt(env.SPAM_TIME_LIMIT, 10) || 5;
  procVars.companyName = env.HUBOT_COMPANY_NAME || 'Company Name';
  procVars.peerFeedbackUrl = env.HUBOT_PEER_FEEDBACK_URL || `praise in Lattice (https://${procVars.companyName}.latticehq.com/)`;
  procVars.furtherFeedbackSuggestedScore = parseInt(env.HUBOT_FURTHER_FEEDBACK_SCORE, 10) || 10;
  procVars.mongoUri = env.MONGODB_URI || env.MONGO_URI || env.MONGODB_URL || env.MONGOLAB_URI || env.MONGOHQ_URL || 'mongodb://localhost/plusPlus';
  procVars.cryptoRpcProvider = env.HUBOT_CRYPTO_RPC_PROVIDER || '';
  procVars.magicNumber = env.HUBOT_UNIMPORTANT_MAGIC_NUMBER || 'nope';
  procVars.magicIv = env.HUBOT_UNIMPORTANT_MAGIC_IV || 'yup';
  procVars.furtherHelpUrl = env.HUBOT_CRYPTO_FURTHER_HELP_URL || undefined;
  procVars.notificationsRoom = env.HUBOT_PLUSPLUS_NOTIFICATION_ROOM || undefined;
  procVars.falsePositiveNotificationsRoom = env.HUBOT_PLUSPLUS_FALSE_POSITIVE_NOTIFICATION_ROOM || undefined;
  procVars.monthlyScoreboardCron = env.HUBOT_PLUSPLUS_MONTHLY_SCOREBOARD_CRON || '0 10 1-7 * *';
  procVars.monthlyScoreboardDayOfWeek = env.HUBOT_PLUSPLUS_MONTHLY_SCOREBOARD_DAY_OF_WEEK || 1; // 0-6 (Sun - Sat)
  return procVars;
}

module.exports = {
  getMessageForNewScore,
  getMessageForTokenTransfer,
  cleanName,
  cleanAndEncode,
  decode,
  isCakeDay,
  getYearsAsString,
  getEsOnEndOfWord,
  isPrivateMessage,
  capitalizeFirstLetter,
  isKnownFalsePositive,
  getProcessVariables,
};
