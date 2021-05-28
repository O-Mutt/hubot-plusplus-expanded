const scoreKeyword = process.env.HUBOT_PLUSPLUS_KEYWORD || 'score|scores|karma';
const reasonConjunctions = process.env.HUBOT_PLUSPLUS_CONJUNCTIONS || 'for|because|cause|cuz|as|porque|just|thanks for';

const regexp = module.exports;

regexp.votedObject = '((?:[\\-\\w@.-:\u3040-\u30FF\uFF01-\uFF60\u4E00-\u9FA0]+(?<![+-]))|(?:[\'"”][^\'"”]*[\'"”]))';
// allow for spaces after the thing being upvoted (@user ++)
regexp.allowSpaceAfterObject = '\\s*';
regexp.positiveOperators = '\\+\\+';
regexp.positiveOperatorsString = '++';
regexp.negativeOperators = '--|—|\u2013|\u2014';
regexp.operator = `(${regexp.positiveOperators}|${regexp.negativeOperators})`;
regexp.reasonForVote = `(?:\\s+(?:${reasonConjunctions})\\s+(.+))?`;
regexp.eol = '$';

/**
 * botName score for user1
 */
regexp.createAskForScoreRegExp = () => new RegExp(`(?:${scoreKeyword})\\s(\\w+\\s)?${regexp.votedObject}`, 'i');

/**
 * botName erase user1
 * botName erase user2 because they quit and i don't like quitters
 */
regexp.createEraseUserScoreRegExp = () => {
  // from beginning of line
  const eraseClause = '(?:erase)';

  return new RegExp(`${eraseClause}${regexp.allowSpaceAfterObject}${regexp.votedObject}${regexp.allowSpaceAfterObject}${regexp.reasonForVote}${regexp.eol}`, 'i');
};

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

  return new RegExp(`${beginningOfLine}${multiUserVotedObject}${regexp.allowSpaceAfterObject}${regexp.operator}${regexp.reasonForVote}${regexp.eol}`, 'i');
};

/**
 * botName top 100
 * botName bottom 3
 */
regexp.createTopBottomRegExp = () => {
  const topOrBottom = '(top|bottom)';
  const digits = '(\\d+)';
  return new RegExp(`${topOrBottom}${regexp.allowSpaceAfterObject}${digits}`, 'i');
};

regexp.createTopBottomTokenRegExp = () => {
  const topOrBottom = '(top|bottom)';
  const digits = '(\\d+)';
  return new RegExp(`${topOrBottom}${regexp.allowSpaceAfterObject}tokens${regexp.allowSpaceAfterObject}${digits}`, 'i');
}

/**
 * user1++ for being dope
 * user1-- cuz nope
 * billy @bob++
 */
regexp.createUpDownVoteRegExp = () => new RegExp(`${regexp.votedObject}${regexp.allowSpaceAfterObject}${regexp.operator}${regexp.reasonForVote}${regexp.eol}`, 'i');

/**
 * @qrafty level me up
 */
regexp.createLevelUpAccount = () => new RegExp(/(level (me )?up|upgrade (my account|me)|me\+\+)/, 'i');

/**
 * @qrafty help
 */
regexp.getHelp = () => new RegExp(`(help|-h|--help)${regexp.eol}`, 'i');
