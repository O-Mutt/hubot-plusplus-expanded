import { Adapter, CatchAllMessage, ListenerCallback, Response } from 'hubot';
import { NEGATIVE_OPERATORS, POSITIVE_OPERATORS } from '../matcherConstants';
import { SlackBot } from 'hubot-slack';

export interface PlusPlusMatches {
  fullText: string;
  silent: boolean;
  name: string;
  operator: 1 | -1;
  usedOperator:
    | (typeof POSITIVE_OPERATORS)[number]
    | (typeof NEGATIVE_OPERATORS)[number];
  operatorSymbol: '++' | '--';
  reason: string | null;
  preMessage: string | null;
  foundConjunction: string | null;
}

export interface PlusPlusMatchesMessage
  extends Response<SlackBot, CatchAllMessage> {
  match: PlusPlusMatches & RegExpMatchArray;
  mentions: { type: string; name: string }[];
}
