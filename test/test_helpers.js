const sinon = require('sinon');

const ScoreKeeper = require('../src/lib/services/scorekeeper');

const robotStub = {
  brain: {
    data: { },
    on() {},
    emit() {},
    save() {},
  },
  logger: {
    debug() {},
    info() {},
    warning() {},
    error() {},
  },
  emit: (not) => not,
  name: 'mockHubot',
  messageRoom: (message) => message,
  adapter: {
    options: {
      token: 'token',
    },
  },
};

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function mockScoreKeeper(mongoUri) {
  const peerFeedbackUrl = '\'Formal Praise\' (company.formal-praise.com)';
  const spamMessage = 'Please slow your roll.';
  return new ScoreKeeper({
    robot: robotStub, mongoUri, peerFeedbackUrl, spamMessage, furtherFeedbackSuggestedScore: 10, spamTimeLimit: 1,
  });
}

module.exports = { robotStub, wait, mockScoreKeeper };
