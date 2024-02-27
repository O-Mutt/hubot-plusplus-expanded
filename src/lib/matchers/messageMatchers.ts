import { CatchAllMessage, Message } from 'hubot';
import { PlusPlusMatches } from './types/plusPlusMatches';
import {
  extractOperator,
  extractPreMessage,
  extractReason,
  extractScoreKeyword,
  extractUserId,
} from './extractors';
import { SlackTextMessage } from 'hubot-slack';

const { REASON_CONJUNCTIONS } = require('./matcherConstants');

export function askForScoreMatcher(msg: CatchAllMessage) {
  try {
    const message = msg.message.text!;
    const hasScoreKeyword = extractScoreKeyword(message);
    if (hasScoreKeyword) {
      return false;
    }
    const userId = extractUserId(message);

    if (!userId) {
      return false;
    }

    return {
      hasScoreKeyword,
      userId,
    };
  } catch (err) {
    return false;
  }
}

/**
 *
 * @param {string} msg the incoming message to match
 * @returns {object} matches object
 */
export function plusPlusMatcher(
  msg: SlackTextMessage,
): PlusPlusMatches | false {
  try {
    const message = msg.message.text!;
    const { foundOperator, operatorSymbol, operatorIndex, direction } =
      extractOperator(message)!;
    const userName = extractUserId(message, operatorIndex)!;
    const preMessage = extractPreMessage(message);

    const afterOperatorMsg = message
      .substring(operatorIndex)
      .replace(foundOperator, '');
    const extractedReason = extractReason(afterOperatorMsg);

    return {
      fullText: message,
      preMessage,
      silent: message.indexOf('--silent') > -1 || message.indexOf('-s') > -1,
      name: userName,
      operator: direction,
      usedOperator: foundOperator,
      operatorSymbol,
      foundConjunction: extractedReason?.foundConjunction ?? null,
      reason: extractedReason?.reasonMessage ?? null,
    };
  } catch (e) {
    return false;
  }
}

class MessageMatcher {
  votedObject: string;
  captureVoted: string;
  nonCaptureVoted: string;
  multiUserSeparator: string;
  allowSpaceAfterObject: string;
  nonCaptureSpace: string;
  reasonForVote: string;
  silentFlag: string;
  eol: string;
  operator: any;
  constructor() {
    this.votedObject =
      '[\\-\\w.-:\u3040-\u30FF\uFF01-\uFF60\u4E00-\u9FA0]+(?<![+-])';
    this.captureVoted = `@(${this.votedObject})`;
    this.nonCaptureVoted = `@(?:${this.votedObject})`;
    this.multiUserSeparator = '(?:\\,|\\s|(?:\\s)?\\:(?:\\s)?)';
    // allow for spaces after the thing being upvoted (@user ++)
    this.allowSpaceAfterObject = '\\s*';
    this.nonCaptureSpace = `(?:${this.allowSpaceAfterObject})`;
    // has reason conjunction maybe spaces and then not --silent or -s and then the reason
    // and the .+ can't end with -s or --silent
    this.reasonForVote = `(?:\\s+(${REASON_CONJUNCTIONS})?\\s*((?!-s|--silent).+(?!-s|--silent)))?`;
    this.silentFlag = '(?:\\s+(--silent|-s))?';
    this.eol = '$';
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
      `${multiUserVotedObject}${this.allowSpaceAfterObject}${this.operator}${this.reasonForVote}${this.silentFlag}${this.eol}`,
      // `${multiUserVotedObject}${this.allowSpaceAfterObject}${this.operator}${this.reasonForVote}${this.eol}`,
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

const regExpPlusPlus = new MessageMatcher();

export default regExpPlusPlus;
export const rpp = regExpPlusPlus;
export const RegExpPlusPlus = regExpPlusPlus;
export const Class = MessageMatcher;
