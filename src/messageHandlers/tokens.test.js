const chai = require('chai');
chai.use(require('sinon-chai'));
const sinon = require('sinon');

const { expect } = chai;

const { MongoClient } = require('mongodb');
const mongoUnit = require('mongo-unit');
const TestHelper = require('hubot-test-helper');
const SlackClient = require('@slack/client');

const Helpers = require('../lib/Helpers');
const { mockScoreKeeper, wait } = require('../../test/test_helpers');
const testData = require('../../test/mockData');
const ScoreKeeper = require('../lib/services/scorekeeper');

describe('Tokens', () => {
  let room;
  let db;
  let tokenHelper;
  before(async () => {
    const url = await mongoUnit.start();
    const client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const connection = await client.connect();
    db = connection.db();
    process.env.MONGODB_URI = url;
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;

    tokenHelper = new TestHelper('./messageHandlers/tokens.js');
  });

  after(async () => {
    sinon.restore();
  });

  beforeEach(async () => {
    sinon.stub(SlackClient, 'WebClient').withArgs('token').returns({
      users: {
        info: sinon.stub().returns({ user: { profile: { email: 'test@email.com' } } }),
      },
    });
    room = tokenHelper.createRoom();
    const mockInst = mockScoreKeeper(process.env.MONGODB_URI);
    sinon.stub(ScoreKeeper, 'constructor').returns(mockInst);
    sinon.stub(Helpers, 'isA1Day').returns(false);
    return mongoUnit.load(testData);
  });

  afterEach(async () => {
    sinon.restore();
    room.destroy();
    return mongoUnit.drop();
  });

  describe('giveTokenBetweenUsers', () => {
    it('should add a X points when a user is + #\'d', async () => {
      room.user.say('peter.parker', '@hubot @peter.parker.min + 5');
      await wait(55);
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1].length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        '<@peter.parker> transferred *5* hubot Tokens to <@peter.parker.min>.'
        + '\n<@peter.parker.min> now has 13 tokens.'
        + '\n_<@peter.parker> has 195 tokens_',
      );
      const to = await db.collection('scores').findOne({ name: 'peter.parker.min' });
      expect(to.score).to.equal(8);
      expect(to.token).to.equal(13);
      const from = await db.collection('scores').findOne({ name: 'peter.parker' });
      expect(from.score).to.equal(200);
      expect(from.token).to.equal(195);
    });

    it('should error and message if sender is short on tokens', async () => {
      room.user.say('peter.parker.min', '@hubot @peter.parker + 55');
      await wait(55);
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1].length).to.equal(2);
      expect(room.messages[1][1]).to.match(/You don't have enough tokens to send 55 to peter.parker/);
      const to = await db.collection('scores').findOne({ name: 'peter.parker' });
      expect(to.score).to.equal(200);
      expect(to.token).to.equal(200);
      const from = await db.collection('scores').findOne({ name: 'peter.parker.min' });
      expect(from.score).to.equal(8);
      expect(from.token).to.equal(8);
    });

    it('should error and message if sender is not level 2', async () => {
      room.user.say('matt.erickson.min', '@hubot @peter.parker + 55');
      await wait(55);
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1].length).to.equal(2);
      expect(room.messages[1][1]).to.equal('In order to send tokens to peter.parker you both must be, at least, level 2.');
      const to = await db.collection('scores').findOne({ name: 'peter.parker' });
      expect(to.score).to.equal(200);
      expect(to.token).to.equal(200);
      const from = await db.collection('scores').findOne({ name: 'matt.erickson.min' });
      expect(from.score).to.equal(8);
      expect(from.token).to.equal(undefined);
    });

    it('should error and message if recipient is not level 2', async () => {
      room.user.say('peter.parker', '@hubot @matt.erickson + 55');
      await wait(55);
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1].length).to.equal(2);
      expect(room.messages[1][1]).to.equal('In order to send tokens to matt.erickson you both must be, at least, level 2.');
      const to = await db.collection('scores').findOne({ name: 'matt.erickson' });
      expect(to.score).to.equal(227);
      expect(to.token).to.equal(undefined);
      const from = await db.collection('scores').findOne({ name: 'peter.parker' });
      expect(from.score).to.equal(200);
      expect(from.token).to.equal(200);
    });

    it('should error on second point (for spam check)', async () => {
      room.user.say('peter.parker', '@hubot @peter.parker.min + 2');
      await wait(55);
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1].length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        '<@peter.parker> transferred *2* hubot Tokens to <@peter.parker.min>.'
        + '\n<@peter.parker.min> now has 10 tokens.'
        + '\n_<@peter.parker> has 198 tokens_',
      );
      const to = await db.collection('scores').findOne({ name: 'peter.parker.min' });
      expect(to.score).to.equal(8);
      expect(to.token).to.equal(10);
      const from = await db.collection('scores').findOne({ name: 'peter.parker' });
      expect(from.score).to.equal(200);
      expect(from.token).to.equal(198);
      room.user.say('peter.parker', '@hubot @peter.parker.min + 2');
      await wait(55);
      const spamCheck = await db.collection('scoreLog').findOne({ from: 'peter.parker' });
      expect(Object.keys(spamCheck)).to.eql(['_id', 'from', 'to', 'date', 'room', 'reason', 'scoreChange']);
      spamCheck.date = '123'; // hack to handle date;
      spamCheck._id = '1';
      expect(spamCheck).to.deep.include({
        from: 'peter.parker', to: 'peter.parker.min', reason: null, room: room.name, scoreChange: 2, _id: '1', date: '123',
      });
      expect(room.messages[3][1]).to.equal("I'm sorry <@peter.parker>, I'm afraid I can't do that.");
    });
  });
});