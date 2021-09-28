const chai = require('chai');
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const mongoUnit = require('mongo-unit');
const Helper = require('hubot-test-helper');

const testData = require('./mockData');

const { expect } = chai;

describe('Scoreboard', function () {
  let room;
  let scoreboard;
  let sandbox;
  before(async function () {
    const url = await mongoUnit.start();
    process.env.MONGODB_URI = url;
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
    scoreboard = new Helper('../src/scoreboard.js');
  });

  beforeEach(async function () {
    sandbox = sinon.createSandbox();
    room = scoreboard.createRoom();
    return mongoUnit.load(testData);
  });

  afterEach(async function () {
    sandbox.restore();
    room.destroy();
    return mongoUnit.drop();
  });

  describe('getScore', function getScoreTest() {
    it('should respond with 5 reasons if the user has 5', async function () {
      room.user.say('matt.erickson', '@hubot score for @matt.erickson');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.match(
        /<@matt\.erickson> has 227 points\.\nAccount Level: 1\nTotal Points Given: 14\n:birthday: Hubotday is 07-09-2020\n\n:star: Here are some reasons :star:(\n.*:.*){5}/,
      );
    });

    it('should respond with 3 reasons if the user has 3', async function () {
      room.user.say('matt.erickson.min', '@hubot score for @matt.erickson.min');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.match(
        /<@matt\.erickson\.min> has 8 points\.\nAccount Level: 1\nTotal Points Given: -2\n:birthday: Hubotday is 07-09-2020\n\n:star: Here are some reasons :star:(\n.*:.*){3}/,
      );
    });

    it('should respond with 3 reasons if the user has 3 and token count', async function () {
      room.user.say('peter.parker.min', '@hubot score for @peter.parker.min');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.match(
        /<@peter\.parker\.min> has 8 points \(\*8 Hubot Tokens\*\)\.\nAccount Level: 2\nTotal Points Given: -2\n:birthday: Hubotday is 07-09-2020\n\n:star: Here are some reasons :star:(\n.*:.*){3}/
      );
    });
  });

  describe('respondWithLeaderLoserBoard', function () {
    it('should respond with top 2 leaders on the scoreboard', async function () {
      room.user.say('matt.erickson', '@hubot top 2');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.include(
        '\n1. <@matt.erickson>: 227\n2. <@peter.parker>: 200 (*200 Hubot Tokens*)',
      );
    });

    it('should respond with bottom 2 losers on the scoreboard', async function () {
      room.user.say('matt.erickson', '@hubot bottom 2');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.include(
        '\n1. <@peter.parker.min>: 8 (*8 Hubot Tokens*)\n2. <@matt.erickson.min>: 8',
      );
    });

    it('should respond with top 2 leaders on the scoreboard if account level of one user is level 2', async function () {
      room.user.say('matt.erickson', '@hubot top 2');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.include(
        '\n1. <@matt.erickson>: 227\n2. <@peter.parker>: 200 (*200 Hubot Tokens*)',
      );
    });
  });

  describe('respondWithLeaderLoserTokenBoard', function () {
    it('should respond with top 2 leaders on the scoreboard', async function () {
      room.user.say('matt.erickson', '@hubot top tokens 2');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.include(
        '\n1. <@peter.parker>: *200 Hubot Tokens* (200 points)\n2. <@peter.parker.min>: *8 Hubot Tokens* (8 points)',
      );
    });

    it('should respond with bottom 2 leaders on the scoreboard', async function () {
      room.user.say('matt.erickson', '@hubot bottom tokens 2');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.include(
        '\n1. <@peter.parker.min>: *8 Hubot Tokens* (8 points)\n2. <@peter.parker>: *200 Hubot Tokens* (200 points)',
      );
    });
  });

  describe('respondWithUsersBotDay', function respondWithUsersBotDay() {
    it('should respond with the hubot day when asked', async function () {
      room.user.say('matt.erickson', 'hubot when is my hubotday?');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.equal('Your hubotday is 07-09-2020');
    });

    it('should respond with the hubot day when asked about a different persons hubot day', async function () {
      room.user.say('phil.bob', 'hubot what day is matt.erickson hubot day?');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.equal(
        '<@matt.erickson>\'s hubotday is 07-09-2020',
      );
    });

    it('should respond with the hubot day when asked about a different persons (with \') hubot day', async function () {
      room.user.say('phil.bob', 'hubot what day is matt.erickson\'s hubot day?');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.equal(
        '<@matt.erickson>\'s hubotday is 07-09-2020',
      );
    });

    it('should respond with the hubot day when asked about a different persons (with space \') hubot day', async function () {
      room.user.say(
        'phil.bob',
        'hubot what day is matt.erickson \'s hubot day?',
      );
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.equal(
        '<@matt.erickson>\'s hubotday is 07-09-2020',
      );
    });
  });
});
