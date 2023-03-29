const chai = require('chai');
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const mongoUnit = require('mongo-unit');
const TestHelper = require('hubot-test-helper');

const testData = require('../test/mockData');

const { expect } = chai;

describe('Scoreboard', () => {
  let room;
  let scoreboard;
  let sandbox;
  before(async () => {
    const url = await mongoUnit.start();
    process.env.MONGODB_URI = url;
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
    scoreboard = new TestHelper('./scoreboard.js');
  });

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    room = scoreboard.createRoom();
    return mongoUnit.load(testData);
  });

  afterEach(async () => {
    sandbox.restore();
    room.destroy();
    return mongoUnit.drop();
  });

  describe('getScore', () => {
    it('should respond with 5 reasons if the user has 5', async () => {
      room.user.say('matt.erickson', '@hubot score for @matt.erickson');
      await new Promise((resolve) => setTimeout(resolve, 99));
      expect(room.messages[1][1]).to.match(
        /<@matt\.erickson> has 227 points\.\nAccount Level: 1\nTotal Points Given: 13\n:birthday: Hubotday is Jul. 9th 2020\n\n:star: Here are some reasons :star:(\n.*:.*){5}/,
      );
    });

    it('should respond with 3 reasons if the user has 3', async () => {
      room.user.say('matt.erickson.min', '@hubot score for @matt.erickson.min');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.match(
        /<@matt\.erickson\.min> has 8 points\.\nAccount Level: 1\nTotal Points Given: -2\n:birthday: Hubotday is Jul. 9th 2020\n\n:star: Here are some reasons :star:(\n.*:.*){3}/,
      );
    });

    it('should respond with 3 reasons if the user has 3 and token count', async () => {
      room.user.say('peter.parker.min', '@hubot score for @peter.parker.min');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.match(
        /<@peter\.parker\.min> has 8 points \(\*8 Hubot Tokens\*\)\.\nAccount Level: 2\nTotal Points Given: -2\n:birthday: Hubotday is Jul. 9th 2020\n\n:star: Here are some reasons :star:(\n.*:.*){3}/
      );
    });
  });

  describe('respondWithLeaderLoserBoard', () => {
    it('should respond with top 2 leaders on the scoreboard', async () => {
      room.user.say('matt.erickson', '@hubot top 2');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.include(
        '\n1. <@matt.erickson>: 227\n2. <@peter.parker>: 200 (*200 Hubot Tokens*)',
      );
    });

    it('should respond with bottom 2 losers on the scoreboard', async () => {
      room.user.say('matt.erickson', '@hubot bottom 2');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.include(
        '\n1. <@peter.parker.min>: 8 (*8 Hubot Tokens*)\n2. <@matt.erickson.min>: 8',
      );
    });

    it('should respond with top 2 leaders on the scoreboard if account level of one user is level 2', async () => {
      room.user.say('matt.erickson', '@hubot top 2');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.include(
        '\n1. <@matt.erickson>: 227\n2. <@peter.parker>: 200 (*200 Hubot Tokens*)',
      );
    });
  });

  describe('respondWithLeaderLoserTokenBoard', () => {
    it('should respond with top 2 leaders on the scoreboard', async () => {
      room.user.say('matt.erickson', '@hubot top tokens 2');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.include(
        '\n1. <@peter.parker>: *200 Hubot Tokens* (200 points)\n2. <@peter.parker.min>: *8 Hubot Tokens* (8 points)',
      );
    });

    it('should respond with bottom 2 leaders on the scoreboard', async () => {
      room.user.say('matt.erickson', '@hubot bottom tokens 2');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages[1][1]).to.include(
        '\n1. <@peter.parker.min>: *8 Hubot Tokens* (8 points)\n2. <@peter.parker>: *200 Hubot Tokens* (200 points)',
      );
    });
  });
});
