const chai = require('chai');
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const Helper = require('hubot-test-helper');
const { MongoClient } = require('mongodb');
const mongoUnit = require('mongo-unit');

const { expect } = chai;

const helpers = require('../src/lib/helpers');

const testData = require('./mockData');

describe('PlusPlus', function () {
  let room;
  let db;
  let wallet;
  let sandbox;
  before(async function () {
    const url = await mongoUnit.start();
    const client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const connection = await client.connect();
    db = connection.db();
    process.env.MONGODB_URI = url;
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
    wallet = new Helper('../src/wallet.js');
  });

  beforeEach(async function () {
    sandbox = sinon.createSandbox();
    room = wallet.createRoom();
    return mongoUnit.load(testData);
  });

  afterEach(async function () {
    sandbox.restore();
    room.destroy();
    return mongoUnit.drop();
  });

  describe('upgrade my account', function () {
    it('should respond with message and level up account', async function () {
      room.name = 'D123';
      await room.user.say('matt.erickson', '@hubot upgrade my account');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        `@matt.erickson matt.erickson, we are going to level up your account to Level 2! This means you will start getting ${helpers.capitalizeFirstLetter(room.robot.name)} Tokens as well as points!`,
      );
      const user = await db.collection('scores').findOne({ name: 'matt.erickson' });
      const bot = await db.collection('botToken').findOne({ name: 'hubot' });
      expect(user.score).to.equal(227, 'score should equal default 227');
      expect(user.token).to.equal(227, 'tokens should equal 227, the same as the score');
      expect(user.accountLevel).to.equal(2, 'account level should now be 2');
      expect(bot.token).to.equal(800000000000 - 227, `${room.robot.name} should have 8T - 227 tokens (799999999773)`);
    });
  });
});
