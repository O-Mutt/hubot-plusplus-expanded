const chai = require('chai');
chai.use(require('sinon-chai'));

const { expect } = chai;

const { MongoClient } = require('mongodb');
const mongoUnit = require('mongo-unit');
const Promise = require('bluebird');
const Helper = require('hubot-test-helper');

const mockMinUser = require('./mock_minimal_user.json');
const mockFullUser = require('./mock_full_user.json');
const mockFullUserLevelTwo = require('./mock_full_user_level_2.json')
const mockMinUserLevelTwo = require('./mock_minimal_user_level_2.json')

describe('PlusPlus', function plusPlusTest() {
  let room; let db; let plusPlusHelper;
  this.timeout('25s');
  before(async function () {
    const url = await mongoUnit.start();
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    const connection = await client.connect();
    db = connection.db();
    process.env.MONGODB_URI = url;
    plusPlusHelper = new Helper('../src/plusplus.js');
  });

  beforeEach(async function () {
    room = plusPlusHelper.createRoom();
    await db.collection('scores').insertMany([mockMinUser, mockFullUser]);
  });

  afterEach(async function () {
    room.destroy();
    await db.collection('scores').deleteMany({});
  });

  describe('getScore', function getScoreTest() {
    it('should respond with 5 reasons if the user has 5', async function respondWithScore() {
      room.user.say('matt.erickson', '@hubot score for matt.erickson');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(30)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.match(/matt\.erickson has 227 points\.\n\n:star: Here are some reasons :star:(\n.*:.*){5}/);
    });

    it('should respond with 3 reasons if the user has 3', async function respondWithScore() {
      room.user.say('matt.erickson.min', '@hubot score for matt.erickson.min');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(20)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.match(/matt\.erickson\.min has 8 points\.\n\n:star: Here are some reasons :star:(\n.*:.*){3}/);
    });
  });

  describe('respondWithUsersBotDay', function respondWithUsersBotDay() {
    it('should respond with the hubot day when asked', async function respondWithDay() {
      room.user.say('matt.erickson', 'hubot when is my hubotday?');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(30)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.equal('Your hubotday is 07-09-2020');
    });

    it('should respond with the hubot day when asked about a different persons hubot day', async function respondWithDay() {
      room.user.say('phil.bob', 'hubot what day is matt.erickson hubot day?');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(30)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.equal('matt.erickson\'s hubotday is 07-09-2020');
    });

    it('should respond with the hubot day when asked about a different persons (with \') hubot day', async function respondWithDay() {
      room.user.say('phil.bob', 'hubot what day is matt.erickson\'s hubot day?');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(30)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.equal('matt.erickson\'s hubotday is 07-09-2020');
    });

    it('should respond with the hubot day when asked about a different persons (with space \') hubot day', async function respondWithDay() {
      room.user.say('phil.bob', 'hubot what day is matt.erickson \'s hubot day?');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(30)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.equal('matt.erickson\'s hubotday is 07-09-2020');
    });
  });

  describe('respondWithHubotGuidance', function () {
    it('should respond with hubot usage guidance', async function () {
      room.user.say('peter.nguyen', '@hubot help');

      await (new Promise.delay(30)); // wait for the db call in hubot

      const message = room.messages[1][1];
      const { blocks } = message.attachments[0];
      expect(blocks.length).to.equal(3);
      expect(blocks).to.deep.include({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Need help with hubot?',
        },
      });
      expect(blocks).to.deep.include({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_Commands_:',
        },
      });
    });
  });

  describe('respondWithLeaderLoserBoard', function respondWithLeaderLoserBoard() {
    it('should respond with top 2 leaders on the scoreboard', async function respondWithLeaderLoserBoard() {
      room.user.say('matt.erickson', '@hubot top 2');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(20)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.match(/\n1. matt.erickson : 227\n2. matt.erickson.min : 8/);
    });
    it('should respond with bottom 2 losers on the scoreboard', async function respondWithLeaderLoserBoard() {
      room.user.say('matt.erickson', '@hubot bottom 2');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(20)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.match(/\n1. matt.erickson.min : 8\n2. matt.erickson : 227/);
    })
    it('should respond with top 2 leaders on the scoreboard if account level if one user is level 2', async function respondWithLeaderLoserBoard() {
      await db.collection('scores').insertMany([mockFullUserLevelTwo]);
      room.user.say('matt.erickson', '@hubot top 2');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(20)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.include("\n1. matt.erickson : 227\n2. peter.parker : 200 (200 Tokens)");
    });
  });

  describe('respondWithLeaderLoserTokenBoard', function respondWithLeaderLoserTokenBoard() {
    beforeEach(async function () {
      await db.collection('scores').insertMany([mockFullUserLevelTwo, mockMinUserLevelTwo]);
    });
  
    afterEach(async function () {
      await db.collection('scores').deleteMany({});
    });

    it('should respond with top 2 leaders on the scoreboard', async function respondWithLeaderLoserTokenBoard() {
      room.user.say('matt.erickson', '@hubot top tokens 2');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(20)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.include("\n1. peter.parker : 200 Tokens (200 points)\n2. peter.parker.min : 8 Tokens (8 points)");
    });

    it('should respond with bottom 2 leaders on the scoreboard', async function respondWithLeaderLoserTokenBoard() {
      room.user.say('matt.erickson', '@hubot bottom tokens 2');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(20)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.include("\n1. peter.parker.min : 8 Tokens (8 points)\n2. peter.parker : 200 Tokens (200 points)");
    });
  });
});
