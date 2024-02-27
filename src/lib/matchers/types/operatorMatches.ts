import { NEGATIVE_OPERATORS, POSITIVE_OPERATORS } from '../matcherConstants';
export type OperatorMatches = {
  foundOperator:
    | (typeof POSITIVE_OPERATORS)[number]
    | (typeof NEGATIVE_OPERATORS)[number];
  operatorSymbol: '++' | '--';
  operatorIndex: number;
  direction: 1 | -1;
};
