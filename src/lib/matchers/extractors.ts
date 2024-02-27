import {
  NEGATIVE_OPERATORS,
  POSITIVE_OPERATORS,
  REASON_CONJUNCTIONS,
  SCORE_KEYWORDS,
} from './matcherConstants';
import { OperatorMatches } from './types/OperatorMatches';

export function extractScoreKeyword(msg: string) {
  try {
    for (const keyword of SCORE_KEYWORDS) {
      if (msg.indexOf(keyword) > -1) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

export function extractPreMessage(msg: string) {
  try {
    let preMessage = msg;
    preMessage.slice(0, msg.indexOf('@'));
    return preMessage;
  } catch (e) {
    return null;
  }
}

export function extractUserId(msg: string, operatorIndex: number = -1) {
  try {
    const userIdStart = msg.indexOf('@');
    let userIdEnd = operatorIndex;
    if (operatorIndex === -1) {
      const afterUserIndex =
        msg.indexOf(' ', userIdStart) ??
        msg.indexOf('+', userIdStart) ??
        msg.indexOf('-', userIdStart);
      userIdEnd = afterUserIndex !== -1 ? afterUserIndex : msg.length;
    }
    const userId = msg.substring(userIdStart + 1, userIdEnd);

    return userId.trim();
  } catch (e) {
    return null;
  }
}

export function extractOperator(msg: string): OperatorMatches | null {
  let returnObj: OperatorMatches | null = null;
  for (const positive of POSITIVE_OPERATORS) {
    const operatorIndex = msg.indexOf(positive);
    if (operatorIndex > -1) {
      return (returnObj = {
        foundOperator: positive,
        operatorSymbol: '++',
        operatorIndex,
        direction: 1,
      });
    }
  }

  for (const negative of NEGATIVE_OPERATORS) {
    const operatorIndex = msg.indexOf(negative);
    if (operatorIndex > -1) {
      return (returnObj = {
        foundOperator: negative,
        operatorSymbol: '--',
        operatorIndex,
        direction: -1,
      });
    }
  }

  return returnObj;
}

export function extractReason(
  msg: string,
): { foundConjunction: string | null; reasonMessage: string | null } | null {
  try {
    let reasonMessage: string | null = msg;
    let foundConjunction: string | null = null;
    for (const conjunction of REASON_CONJUNCTIONS) {
      if (msg.indexOf(conjunction) > -1) {
        foundConjunction = conjunction;
        reasonMessage = msg.replace(new RegExp(conjunction, 'i'), '').trim();
        break;
      }
    }

    reasonMessage = reasonMessage.replace(/(-s|--silent)/, '').trim();
    if (reasonMessage.length === 0) {
      reasonMessage = null;
    }
    return {
      foundConjunction,
      reasonMessage,
    };
  } catch (e) {
    return null;
  }
}
