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

module.exports = { robotStub };
