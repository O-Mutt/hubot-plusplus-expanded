
const scoreKeyword = process.env.HUBOT_PLUSPLUS_KEYWORD || 'score|scores|karma';
const reasonConjunctions = process.env.HUBOT_PLUSPLUS_CONJUNCTIONS || 'for|because|cause|cuz|as|porque';

const votedObject = '((?:[\\-\\w@.-:\u3040-\u30FF\uFF01-\uFF60\u4E00-\u9FA0]+(?<![+-]))|(?:[\'"”][^\'"”]*[\'"”]))';
// allow for spaces after the thing being upvoted (@user ++)
const allowSpaceAfterObject = '\\s*';
const operator = '(\\+\\+|--|—)';
const reasonForVote = `(?:\\s+(?:${reasonConjunctions})\\s+(.+))?`;
const eol = '$';

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

  const trimmed = str.trim().toLowerCase();
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
  const text = buff.toString('ascii');
  return text;
}

/**
 * botName score for user1
 */
function createAskForScoreRegExp() {
  return new RegExp(`(?:${scoreKeyword})\\s(\\w+\\s)?${votedObject}`, 'i');
}

/**
 * botName erase user1
 * botName erase user2 because they quit and i don't like quitters
 */
function createEraseUserScoreRegExp() {
  // from beginning of line
  const eraseClause = '(?:erase)';

  return new RegExp(`${eraseClause}${allowSpaceAfterObject}${votedObject}${allowSpaceAfterObject}${reasonForVote}${eol}`, 'i');
}

/**
 * { user1, user2 }++
 * { user1, user2 }--
 */
function createMultiUserVoteRegExp() {
  // from beginning of line
  const beginningOfLine = '^';
  // the thing being upvoted, which is any number of words and spaces
  const multiUserVotedObject = '{(.*(,?))\\}';

  return new RegExp(`${beginningOfLine}${multiUserVotedObject}${allowSpaceAfterObject}${operator}${reasonForVote}${eol}`, 'i');
}

/**
 * botName top 100
 * botName bottom 3
 */
function createTopBottomRegExp() {
  const topOrBottom = '(top|bottom)';
  const digits = '(\\d+)';
  return new RegExp(`${topOrBottom}${allowSpaceAfterObject}${digits}`, 'i');
}

/**
 * user1++ for being dope
 * user1-- cuz nope
 * billy @bob++
 */
function createUpDownVoteRegExp() {
  return new RegExp(`${votedObject}${allowSpaceAfterObject}${operator}${reasonForVote}${eol}`, 'i');
}

function getMessageForNewScore(score, name, messageOperator, reason, reasonScore) {
  // if we got a score, then display all the things and fire off events!
  if (typeof score !== 'undefined' && score !== null) {
    if (name === 'heat') {
      const upOrDown = messageOperator === '++' ? 'subir' : 'bajar';
      return `podríamos ${upOrDown} un gradin la calefa???\nLa temperatura debería estar en ${score} ℃.`;
    }
    let scoreStr = `${name} has ${score} points`;
    let reasonStr = '.';
    if (score === 1) {
      scoreStr = `${name} has ${score} point`;
    }
    if (score % 100 === 0) {
      const extraFlare = `:${(score).toString()}:`;
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
    return `${scoreStr}${reasonStr}`;
  }
  return '';
}

const helpers = {
  cleanName,
  cleanAndEncode,
  decode,
  createAskForScoreRegExp,
  createEraseUserScoreRegExp,
  createMultiUserVoteRegExp,
  createTopBottomRegExp,
  createUpDownVoteRegExp,
  getMessageForNewScore,
  votedObject,
};

module.exports = helpers;
