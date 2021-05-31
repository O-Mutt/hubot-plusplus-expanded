const chai = require('chai');
chai.use(require('sinon-chai'));

const { expect } = chai;

const { MongoClient } = require('mongodb');
const mongoUnit = require('mongo-unit');
const Helper = require('hubot-test-helper');

const testData = { scores: [], scoreLog: [{}] };
testData.scores.push(
  require('./mock_minimal_user.json'),
  require('./mock_full_user.json'),
  require('./mock_full_user_level_2.json'),
  require('./mock_minimal_user_level_2.json'),
);

describe('PlusPlus', function () {
  let room;
  let db;
  let plusPlusHelper;
  this.timeout('25s');
  before(async function () {
    const url = await mongoUnit.start();
    const client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const connection = await client.connect();
    db = connection.db();
    process.env.MONGODB_URI = url;
    plusPlusHelper = new Helper('../src/plusplus.js');
  });

  beforeEach(async function () {
    room = plusPlusHelper.createRoom();
    return mongoUnit.load(testData);
  });

  afterEach(async function () {
    room.destroy();
    return mongoUnit.drop();
  });

  describe('plusplus', function () {
    it('should add a point when a user is ++\'d', async function () {
      room.user.say('matt.erickson', '@derp++');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.match(/derp has 1 point\./);
      const user = await db.collection('scores').findOne({ name: 'derp' });
      expect(user.score).to.equal(1);
    });

    it('should add a point when a user that is already in the db is ++\'d', async function () {
      room.user.say('derp', '@matt.erickson++');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.match(/matt.erickson has 228 points\./);
      const user = await db
        .collection('scores')
        .findOne({ name: 'matt.erickson' });
      expect(user.score).to.equal(228);
    });

    it('should add a point to each user in the multi-user plus plus', async function () {
      room.user.say('derp', '{ @darf, @greg, @tank } ++');
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(room.messages[1][1]).to.match(
        /darf has 1 point\.\n:birthday: Today is darf\'s hubotday! :birthday:\ngreg has 1 point\.\n:birthday: Today is greg\'s hubotday! :birthday:\ntank has 1 point\.\n:birthday: Today is tank\'s hubotday! :birthday:/,
      );
    });

    it('should subtract a point when a user that is already in the db is --\'d', async function () {
      let user = await db
        .collection('scores')
        .findOne({ name: 'matt.erickson.min' });
      expect(user.score).to.equal(8);
      room.user.say('derp', '@matt.erickson.min--');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.match(/matt.erickson.min has 7 points\./);
      user = await db.collection('scores').findOne({ name: 'matt.erickson' });
      expect(user.score).to.equal(227);
    });
  });

  describe('getScore', function getScoreTest() {
    it('should respond with 5 reasons if the user has 5', async function () {
      room.user.say('matt.erickson', '@hubot score for matt.erickson');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.match(
        /matt\.erickson has 227 points\.\n\n:star: Here are some reasons :star:(\n.*:.*){5}/,
      );
    });

    it('should respond with 3 reasons if the user has 3', async function () {
      room.user.say('matt.erickson.min', '@hubot score for matt.erickson.min');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.match(
        /matt\.erickson\.min has 8 points\.\n\n:star: Here are some reasons :star:(\n.*:.*){3}/,
      );
    });

    it('should respond with 3 reasons if the user has 3 and token count', async function () {
      room.user.say('peter.parker.min', '@hubot score for peter.parker.min');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.match(
        /peter\.parker\.min has 8 points \(\*8 Hubot Tokens\*\)\.\n\n:star: Here are some reasons :star:(\n.*:.*){3}/
      );
    });
  });

  describe('respondWithUsersBotDay', function respondWithUsersBotDay() {
    it('should respond with the hubot day when asked', async function () {
      room.user.say('matt.erickson', 'hubot when is my hubotday?');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.equal('Your hubotday is 07-09-2020');
    });

    it('should respond with the hubot day when asked about a different persons hubot day', async function () {
      room.user.say('phil.bob', 'hubot what day is matt.erickson hubot day?');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.equal(
        'matt.erickson\'s hubotday is 07-09-2020',
      );
    });

    it('should respond with the hubot day when asked about a different persons (with \') hubot day', async function () {
      room.user.say('phil.bob', 'hubot what day is matt.erickson\'s hubot day?');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.equal(
        'matt.erickson\'s hubotday is 07-09-2020',
      );
    });

    it('should respond with the hubot day when asked about a different persons (with space \') hubot day', async function () {
      room.user.say(
        'phil.bob',
        'hubot what day is matt.erickson \'s hubot day?',
      );
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.equal(
        'matt.erickson\'s hubotday is 07-09-2020',
      );
    });
  });

  describe('respondWithHubotGuidance', function () {
    it('should respond with hubot usage guidance', async function () {
      room.user.say('peter.nguyen', '@hubot help');
      await new Promise((resolve) => setTimeout(resolve, 30));
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

  describe('respondWithLeaderLoserBoard', function () {
    it('should respond with top 2 leaders on the scoreboard', async function () {
      room.user.say('matt.erickson', '@hubot top 2');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.include(
        '\n1. matt.erickson: 227\n2. peter.parker: 200 (*200 Hubot Tokens*)',
      );
    });

    it('should respond with bottom 2 losers on the scoreboard', async function () {
      room.user.say('matt.erickson', '@hubot bottom 2');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.include(
        '\n1. matt.erickson.min: 8\n2. peter.parker.min: 8 (*8 Hubot Tokens*)',
      );
    });

    it('should respond with top 2 leaders on the scoreboard if account level of one user is level 2', async function () {
      room.user.say('matt.erickson', '@hubot top 2');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.include(
        '\n1. matt.erickson: 227\n2. peter.parker: 200 (*200 Hubot Tokens*)',
      );
    });
  });

  describe('respondWithLeaderLoserTokenBoard', function () {
    it('should respond with top 2 leaders on the scoreboard', async function () {
      room.user.say('matt.erickson', '@hubot top tokens 2');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.include(
        '\n1. peter.parker: *200 Hubot Tokens* (200 points)\n2. peter.parker.min: *8 Hubot Tokens* (8 points)',
      );
    });

    it('should respond with bottom 2 leaders on the scoreboard', async function () {
      room.user.say('matt.erickson', '@hubot bottom tokens 2');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages[1][1]).to.include(
        '\n1. peter.parker.min: *8 Hubot Tokens* (8 points)\n2. peter.parker: *200 Hubot Tokens* (200 points)',
      );
    });
  });

  describe('version', function () {
    it('should respond with the name and version of the package when asked --version', async function () {
      await room.user.say('matt.erickson', '@hubot --version');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        'Hubot hubot-plusplus-expanded, version: 2.1.2',
      );
    });

    it('should respond with the name and version of the package when asked -v', async function () {
      await room.user.say('matt.erickson', '@hubot -v');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        'Hubot hubot-plusplus-expanded, version: 2.1.2',
      );
    });

    it('should respond with the name and version of the package when asked `plusplus version`', async function () {
      await room.user.say('matt.erickson', '@hubot plusplus version');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        'Hubot hubot-plusplus-expanded, version: 2.1.2',
      );
    });
  });
});
