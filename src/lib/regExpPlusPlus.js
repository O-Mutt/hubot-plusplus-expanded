const scoreKeyword = process.env.HUBOT_PLUSPLUS_KEYWORD || 'score|scores|karma';
const reasonConjunctions =
  process.env.HUBOT_PLUSPLUS_CONJUNCTIONS ||
  'for|because|cause|cuz|as|porque|just|thanks for';

class RegExpPlusPlus {
  constructor() {
    this.votedObject =
      '[\\-\\w.-:\u3040-\u30FF\uFF01-\uFF60\u4E00-\u9FA0]+(?<![+-])';
    this.captureVoted = `@(${this.votedObject})`;
    this.nonCaptureVoted = `@(?:${this.votedObject})`;
    this.multiUserSeparator = '(?:\\,|\\s|(?:\\s)?\\:(?:\\s)?)';
    // allow for spaces after the thing being upvoted (@user ++)
    this.allowSpaceAfterObject = '\\s*';
    this.nonCaptureSpace = `(?:${this.allowSpaceAfterObject})`;
    this.positiveOperators =
      '\\+\\+|:clap:(?::skin-tone-[0-9]:)?|:thumbsup:(?::skin-tone-[0-9]:)?|:thumbsup_all:|:\\+1:(?::skin-tone-[0-9]:)?';
    this.negativeOperators =
      '--|—|\u2013|\u2014|:thumbsdown:(?::skin-tone-[0-9]:)?';
    this.operator = `(${this.positiveOperators}|${this.negativeOperators})`;
    // has reason conjunction maybe spaces and then not --silent or -s and then the reason
    // this.reasonForVote = `(?:\\s+(${reasonConjunctions})?\\s*((?!\\s+--silent|\\s+-s).+))?`;
    this.reasonForVote = `(?:\\s+(${reasonConjunctions})?\\s*(.+))?`;
    this.silentFlag = '(\\s+(--silent|-s))?';
    this.eol = '$';
  }

  /**
   * botName score for user1
   */
  createAskForScoreRegExp() {
    return new RegExp(
      `(.*)?(?:${scoreKeyword})\\s(\\w+\\s)?${this.captureVoted}`,
      'i',
    );
  }

  /**
   * botName erase user1
   * botName erase user2 because they quit and i don't like quitters
   */
  createEraseUserScoreRegExp() {
    const eraseClause = '(?:erase)';

    return new RegExp(
      `(.*)?${eraseClause}${this.allowSpaceAfterObject}${this.captureVoted}${this.allowSpaceAfterObject}${this.reasonForVote}${this.eol}`,
      'i',
    );
  }

  /**
   * { user1, user2 }++
   * { user1, user2 }--
   */
  createMultiUserVoteRegExp() {
    // the thing being upvoted, which is any number of words and spaces
    const multiUserVotedObject = `(.*)?(?:\\{|\\[|\\()\\s?((?:${this.nonCaptureVoted}${this.nonCaptureSpace}${this.multiUserSeparator}?${this.nonCaptureSpace}?)+)\\s?(?:\\}|\\]|\\))`;

    return new RegExp(
      //      `${multiUserVotedObject}${this.allowSpaceAfterObject}${this.operator}${this.reasonForVote}${this.silentFlag}${this.eol}`,
      `${multiUserVotedObject}${this.allowSpaceAfterObject}${this.operator}${this.reasonForVote}${this.eol}`,
      'i',
    );
  }

  /**
   * botName top 100
   * botName bottom 3
   */
  createTopBottomRegExp() {
    const topOrBottom = '(top|bottom)';
    const digits = '(\\d+)';
    return new RegExp(
      `${topOrBottom}${this.allowSpaceAfterObject}${digits}`,
      'i',
    );
  }

  createTopBottomTokenRegExp() {
    const topOrBottom = '(top|bottom)';
    const digits = '(\\d+)';
    return new RegExp(
      `${topOrBottom}${this.allowSpaceAfterObject}tokens${this.allowSpaceAfterObject}${digits}`,
      'i',
    );
  }

  createTopPointGiversRegExp() {
    const topOrBottom = '(top|bottom)';
    const digits = '(\\d+)';
    return new RegExp(
      `${topOrBottom}${this.allowSpaceAfterObject}(?:point givers?|point senders?|givers?|senders?)${this.allowSpaceAfterObject}${digits}`,
      'i',
    );
  }

  /**
   * user1++ for being dope
   * user1-- cuz nope
   * billy @bob++
   */
  createUpDownVoteRegExp() {
    return new RegExp(
      // `(.*)?${this.captureVoted}${this.allowSpaceAfterObject}${this.operator}${this.reasonForVote}${this.silentFlag}${this.eol}`,
      `(.*)?${this.captureVoted}${this.allowSpaceAfterObject}${this.operator}${this.reasonForVote}${this.eol}`,
      'i',
    );
  }

  /**
   *
   * @returns user1 + # for being the best
   */
  createGiveTokenRegExp() {
    const reg = new RegExp(
      // `(.*)?${this.captureVoted}${this.allowSpaceAfterObject}\\+${this.allowSpaceAfterObject}([0-9]{1,})${this.reasonForVote}${this.silentFlag}${this.eol}`,
      `(.*)?${this.captureVoted}${this.allowSpaceAfterObject}\\+${this.allowSpaceAfterObject}([0-9]{1,})${this.reasonForVote}${this.eol}`,
      'i',
    );
    return reg;
  }

  /**
   * @hubot level me up
   */
  // eslint-disable-next-line class-methods-use-this
  createLevelUpAccount() {
    return /(level (me )?up|upgrade (my account|me))/i;
  }

  /**
   * @hubot help
   */
  // eslint-disable-next-line class-methods-use-this
  getHelp() {
    return /(help|-h|--help)/i;
  }

  /**
   * @hubot hot-wallet or hot wallet or hotwallet
   */
  // eslint-disable-next-line class-methods-use-this
  getBotWallet() {
    return /hot( |-)?wallet/i;
  }
}

const regExpPlusPlus = new RegExpPlusPlus();

module.exports = regExpPlusPlus;
module.exports.rpp = regExpPlusPlus;
module.exports.RegExpPlusPlus = regExpPlusPlus;
module.exports.conjunctions = reasonConjunctions;
