const scoreKeyword = process.env.HUBOT_PLUSPLUS_KEYWORD || 'score|scores|karma';
const reasonConjunctions = process.env.HUBOT_PLUSPLUS_CONJUNCTIONS || 'for|because|cause|cuz|as|porque|just|thanks for';

const votedObject = '((?:[\\-\\w@.-:\u3040-\u30FF\uFF01-\uFF60\u4E00-\u9FA0]+(?<![+-]))|(?:[\'"”][^\'"”]*[\'"”]))';
// allow for spaces after the thing being upvoted (@user ++)
const allowSpaceAfterObject = '\\s*';
const positiveOperators = '\\+\\+';
const positiveOperatorsString = '++';
const negativeOperators = '--|—|\u2013|\u2014';
const operator = `(${positiveOperators}|${negativeOperators})`;
const reasonForVote = `(?:\\s+(?:${reasonConjunctions})\\s+(.+))?`;
const eol = '$';

const regexp = module.exports;

/**
 * botName score for user1
 */
regexp.createAskForScoreRegExp = () => new RegExp(`(?:${scoreKeyword})\\s(\\w+\\s)?${votedObject}`, 'i');

/**
 * botName erase user1
 * botName erase user2 because they quit and i don't like quitters
 */
regexp.createEraseUserScoreRegExp = () => {
  // from beginning of line
  const eraseClause = '(?:erase)';

  return new RegExp(`${eraseClause}${allowSpaceAfterObject}${votedObject}${allowSpaceAfterObject}${reasonForVote}${eol}`, 'i');
}

/**
 *
 */
regexp.createBotDayRegExp = (botName) => new RegExp(`(what\\sday|when|which\\sday|which)\\sis\\s(my|@?\\w+\\.\\w+)(\\s)?('s)?\\s${botName}(\\s)?day(\\?)?`, 'i');

/**
 * { user1, user2 }++
 * { user1, user2 }--
 */
regexp.createMultiUserVoteRegExp = () => {
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
regexp.createTopBottomRegExp = () => {
  const topOrBottom = '(top|bottom)';
  const digits = '(\\d+)';
  return new RegExp(`${topOrBottom}${allowSpaceAfterObject}${digits}`, 'i');
}

/**
 * user1++ for being dope
 * user1-- cuz nope
 * billy @bob++
 */
regexp.createUpDownVoteRegExp = () => new RegExp(`${votedObject}${allowSpaceAfterObject}${operator}${reasonForVote}${eol}`, 'i');

/**
 * @qrafty level me up
 */
regexp.createLevelUpAccount = () => new RegExp(`level me up${eol}`, 'i');

regexp.positiveOperators = positiveOperatorsString;
