const path = require('path');

const mockHubot = () => {
  return {
    brain: {
      data: {},
      on: jest.fn(),
      emit: jest.fn(),
      save: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    },
    emit: jest.fn((not) => not),
    name: 'hubot',
    messageRoom: jest.fn((message) => message),
    adapter: {
      options: {
        token: 'token',
      },
    },
  };
};

function wait(ms = 150) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const mockSlackClient = () => {
  jest.mock('@slack/web-api', () => {
    const actual = jest.requireActual('@slack/web-api');
    return {
      ...actual,
      WebClient: jest.fn().mockReturnValue({
        users: {
          info: jest.fn().mockResolvedValue({
            user: {
              profile: {
                email: 'test@email.com',
              },
            },
          }),
        },
      }),
    };
  });
};

function relativeTestHelperPathHelper(file) {
  const fileDirectory = path.join(__dirname, '..', file);
  console.log(`$$$$ === process.env test_helpers.js [53] ===`, fileDirectory);
  // return path.resolve(currentDirectory, file);
  return fileDirectory;
  // if (process.env.CI) {
  //   return '.';
  // }
  // return '../../../src';
}

module.exports = {
  mockHubot,
  wait,
  mockSlackClient,
  relativeTestHelperPathHelper,
};
