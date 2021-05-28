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
  // eslint-disable-next-line
  const buff = new Buffer.from(trimmed);
  const base64data = buff.toString('base64');
  return base64data;
}

function decode(str) {
  if (!str) {
    return undefined;
  }

  // eslint-disable-next-line
  const buff = new Buffer.from(str, 'base64');
  const text = buff.toString('UTF-8');
  return text;
}

function getMessageForNewScore(score, name, messageOperator, reason, reasonScore, cakeDay, robotName = '') {
  // if we got a score, then display all the things and fire off events!
  if (typeof score !== 'undefined' && score !== null) {
    let scoreStr = `${name} has ${score} points`;
    let reasonStr = '.';
    let cakeDayStr = '';
    if (score === 1) {
      scoreStr = `${name} has ${score} point`;
    }
    if (score % 100 === 0) {
      let scoreFlareStr = (score).toString();
      if (score === 0) {
        scoreFlareStr = 'zero';
      }
      const extraFlare = `:${scoreFlareStr}:`;
      scoreStr = `${extraFlare} ${scoreStr} ${extraFlare}`;
      reasonStr = '';
    }

    if (reason) {
      const decodedReason = this.decode(reason);
      if (reasonScore === 1 || reasonScore === -1) {
        if (score === 1 || score === -1) {
          reasonStr = ` for ${decodedReason}.`;
        } else {
          reasonStr = `, ${reasonScore} of which is for ${decodedReason}.`;
        }
      } else {
        reasonStr = `, ${reasonScore} of which are for ${decodedReason}.`;
      }
    }

    if (this.isCakeDay(cakeDay)) {
      const yearsAsString = this.getYearsAsString(cakeDay);
      cakeDayStr = `\n:birthday: Today is ${name}'s ${yearsAsString}${robotName}day! :birthday:`;
    }
    return `${scoreStr}${reasonStr}${cakeDayStr}`;
  }
  return '';
}

function isCakeDay(dateObject) {
  try {
    const robotDay = new Date(dateObject);
    const today = new Date();
    if (robotDay.getDate() === today.getDate() && robotDay.getMonth() === today.getMonth()) {
      return true;
    }
  // eslint-disable-next-line no-empty
  } catch (e) {
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

function isNotPrivateMessage(msg) {
  const { room, user } = msg.message;
  msg.robot.logger.debug('checking if the user is in the context of a DM or public message', room, user.room);
  // "Shell" is the adapter for running in the terminal
  return room[0] !== 'D' && room !== 'Shell';
}

function capitalizeFirstLetter(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const helpers = {
  cleanName,
  cleanAndEncode,
  decode,
  getMessageForNewScore,
  isCakeDay,
  getYearsAsString,
  isNotPrivateMessage,
  capitalizeFirstLetter,
};

module.exports = helpers;
