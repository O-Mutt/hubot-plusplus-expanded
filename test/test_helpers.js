const sinon = require('sinon');

const robotStub = {
  brain: {
    data: {},
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

module.exports = { robotStub, wait };
