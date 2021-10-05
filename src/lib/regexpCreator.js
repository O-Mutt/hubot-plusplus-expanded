const scoreKeyword = process.env.HUBOT_PLUSPLUS_KEYWORD || 'score|scores|karma';
const reasonConjunctions = process.env.HUBOT_PLUSPLUS_CONJUNCTIONS || 'for|because|cause|cuz|as|porque|just|thanks for';

class RegExpCreator {
  votedObject = '[\\-\\w.-:\u3040-\u30FF\uFF01-\uFF60\u4E00-\u9FA0]+(?<![+-])';
  captureVoted = `@(${this.votedObject})`;
  nonCaptureVoted = `@(?:${this.votedObject})`;
  multiUserSeparator= '(?:\\,|\\s|(?:\\s)?\\:(?:\\s)?)';
  // allow for spaces after the thing being upvoted (@user ++)
  allowSpaceAfterObject = '\\s*';
  positiveOperators = '\\+\\+|:clap:(?::skin-tone-[0-9]:)?|:thumbsup:(?::skin-tone-[0-9]:)?|:thumbsup_all:|:\+\1:(?::skin-tone-[0-9]:)?';
  negativeOperators = '--|—|\u2013|\u2014|:thumbsdown:(?::skin-tone-[0-9]:)?';
  operator = `(${this.positiveOperators}|${this.negativeOperators})`;
  reasonForVote = `(?:\\s+(${reasonConjunctions})?\\s*(.+))?`;
  eol = '$';

  /**
   * botName score for user1
   */
  createAskForScoreRegExp() {
    return new RegExp(`(.*)?(?:${scoreKeyword})\\s(\\w+\\s)?${this.captureVoted}`, 'i');
  }

  /**
   * botName erase user1
   * botName erase user2 because they quit and i don't like quitters
   */
  createEraseUserScoreRegExp() {
    const eraseClause = '(?:erase)';

    return new RegExp(
      `(.*)?${eraseClause}${this.allowSpaceAfterObject}${this.captureVoted}${this.allowSpaceAfterObject}${this.reasonForVote}${this.eol}`,
      'i'
    );
  }

  /**
   * { user1, user2 }++
   * { user1, user2 }--
   */
  createMultiUserVoteRegExp() {
    // the thing being upvoted, which is any number of words and spaces
    const multiUserVotedObject = `(.*)?(?:\\{|\\[|\\()\\s?((?:${this.nonCaptureVoted}${this.multiUserSeparator}?(?:\\s)?)+)\\s?(?:\\}|\\]|\\))`;

    return new RegExp(
      `${multiUserVotedObject}${this.allowSpaceAfterObject}${this.operator}${this.reasonForVote}${this.eol}`,
      'i'
    );
  }

  /**
   * botName top 100
   * botName bottom 3
   */
  createTopBottomRegExp() {
    const topOrBottom = '(top|bottom)';
    const digits = '(\\d+)';
    return new RegExp(`${topOrBottom}${this.allowSpaceAfterObject}${digits}`, 'i');
  }

  createTopBottomTokenRegExp() {
    const topOrBottom = '(top|bottom)';
    const digits = '(\\d+)';
    return new RegExp(
      `${topOrBottom}${this.allowSpaceAfterObject}tokens${this.allowSpaceAfterObject}${digits}`,
      'i'
    );
  }

  createTopPointGiversRegExp() {
    const topOrBottom = '(top|bottom)';
    const digits = '(\\d+)';
    return new RegExp(
      `${topOrBottom}${this.allowSpaceAfterObject}(?:point givers?|point senders?|givers?|senders?)${this.allowSpaceAfterObject}${digits}`,
      'i'
    );
  }
  /**
   * user1++ for being dope
   * user1-- cuz nope
   * billy @bob++
   */
  createUpDownVoteRegExp() {
    return new RegExp(
      `(.*)?${this.captureVoted}${this.allowSpaceAfterObject}${this.operator}${this.reasonForVote}${this.eol}`,
      'i'
    );
  }

  /**
   *
   * @returns user1 + # for being the best
   */
  createGiveTokenRegExp() {
    const reg = new RegExp(
      `(.*)?${this.captureVoted}${this.allowSpaceAfterObject}\\+${this.allowSpaceAfterObject}([0-9]{1,})${this.reasonForVote}${this.eol}`,
      'i'
    );
    return reg;
  }

  /**
   * @hubot level me up
   */
  createLevelUpAccount() {
    return new RegExp(/(level (me )?up|upgrade (my account|me))/, 'i');
  }

  /**
   * @hubot help
   */
  getHelp() {
    return new RegExp(`(help|-h|--help)${this.eol}`, 'i');
  }

  /**
   * @hubot hot-wallet or hot wallet or hotwallet
   */
  getBotWallet() {
    return new RegExp(/hot( |-)?wallet/, 'i');
  }
}

const localReg = new RegExpCreator();
module.exports = localReg;
