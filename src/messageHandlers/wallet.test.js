const sinon = require('sinon');
const TestHelper = require('hubot-test-helper');

const { H } = require('../lib/helpers');
const { wait } = require('../../test/test_helpers');

describe('PlusPlus', () => {
  let room;
  let db;
  let wallet;
  let sandbox;
  beforeAll(async () => {
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
    wallet = new TestHelper('./messageHandlers/wallet.js');
  });

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    room = wallet.createRoom({ httpd: false });
  });

  afterEach(async () => {
    sandbox.restore();
    room.destroy();
  });

  describe('upgrade my account', () => {
    it('should respond with message and level up account', async () => {
      room.name = 'D123';
      await room.user.say('matt.erickson', '@hubot upgrade my account');
      await wait(55);
      expect(room.messages.length).toBe(2);
      expect(room.messages[1][1]).toBe(
        `@matt.erickson matt.erickson, we are going to level up your account to Level 2! This means you will start getting ${H.capitalizeFirstLetter(
          room.robot.name,
        )} Tokens as well as points!`
      );
      const user = await db
        .collection('scores')
        .findOne({ name: 'matt.erickson' });
      const bot = await db.collection('botToken').findOne({ name: 'hubot' });
      expect(user.score).toBe(227);
      expect(user.token).toBe(227);
      expect(user.accountLevel).toBe(2);
      expect(bot.token).toBe(800000000000 - 227);
    });
  });
});
