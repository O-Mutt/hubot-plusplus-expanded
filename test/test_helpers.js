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
    error() {},
  },
  emit: (not) => not,
  name: 'hubot',
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
