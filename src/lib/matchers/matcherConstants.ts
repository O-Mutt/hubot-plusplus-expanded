export let SCORE_KEYWORDS: string[];
if (process.env.HUBOT_PLUSPLUS_KEYWORD) {
  if (
    typeof process.env.HUBOT_PLUSPLUS_KEYWORD === 'string' &&
    process.env.HUBOT_PLUSPLUS_KEYWORD.indexOf('|') > -1
  ) {
    SCORE_KEYWORDS = process.env.HUBOT_PLUSPLUS_KEYWORD.split('|');
  } else {
    SCORE_KEYWORDS = [process.env.HUBOT_PLUSPLUS_KEYWORD];
  }
} else {
  SCORE_KEYWORDS = ['score', 'scores', 'karma', 'karmas'];
}

export let REASON_CONJUNCTIONS: string[];
if (process.env.HUBOT_PLUSPLUS_CONJUNCTIONS) {
  if (
    typeof process.env.HUBOT_PLUSPLUS_CONJUNCTIONS === 'string' &&
    process.env.HUBOT_PLUSPLUS_CONJUNCTIONS.indexOf('|') > -1
  ) {
    REASON_CONJUNCTIONS = process.env.HUBOT_PLUSPLUS_CONJUNCTIONS.split('|');
  } else {
    REASON_CONJUNCTIONS = [process.env.HUBOT_PLUSPLUS_CONJUNCTIONS];
  }
} else {
  REASON_CONJUNCTIONS = [
    'thanks for',
    'for',
    'because',
    'cause',
    'cuz',
    'as',
    'porque',
    'just',
  ];
}

export const POSITIVE_OPERATORS: string[] = [
  '++',
  ':clap:',
  ':clap:::skin-tone-1:',
  ':clap:::skin-tone-2:',
  ':clap:::skin-tone-3:',
  ':clap:::skin-tone-4:',
  ':clap:::skin-tone-5:',
  ':clap:::skin-tone-6:',
  ':clap:::skin-tone-7:',
  ':clap:::skin-tone-8:',
  ':clap:::skin-tone-9:',
  ':thumbsup:',
  ':thumbsup:::skin-tone-1:',
  ':thumbsup:::skin-tone-2:',
  ':thumbsup:::skin-tone-3:',
  ':thumbsup:::skin-tone-4:',
  ':thumbsup:::skin-tone-5:',
  ':thumbsup:::skin-tone-6:',
  ':thumbsup:::skin-tone-7:',
  ':thumbsup:::skin-tone-8:',
  ':thumbsup:::skin-tone-9:',
  ':thumbsup_all:',
  ':+1:',
  ':+1:::skin-tone-1:',
  ':+1:::skin-tone-2:',
  ':+1:::skin-tone-3:',
  ':+1:::skin-tone-4:',
  ':+1:::skin-tone-5:',
  ':+1:::skin-tone-6:',
  ':+1:::skin-tone-7:',
  ':+1:::skin-tone-8:',
  ':+1:::skin-tone-9:',
];
export const NEGATIVE_OPERATORS: string[] = [
  '--',
  '–',
  '—',
  '\u2013',
  '\u2014',
  ':thumbsdown:',
  ':thumbsdown:::skin-tone-1:',
  ':thumbsdown:::skin-tone-2:',
  ':thumbsdown:::skin-tone-3:',
  ':thumbsdown:::skin-tone-4:',
  ':thumbsdown:::skin-tone-5:',
  ':thumbsdown:::skin-tone-6:',
  ':thumbsdown:::skin-tone-7:',
  ':thumbsdown:::skin-tone-8:',
  ':thumbsdown:::skin-tone-9:',
];
