const chai = require('chai');
chai.use(require('sinon-chai'));

const { expect } = chai;

const { MongoClient } = require('mongodb');
const mongoUnit = require('mongo-unit');
const Promise = require('bluebird');
const Helper = require('hubot-test-helper');

const mockMinUser = require('./mock_minimal_user.json');
const mockFullUser = require('./mock_full_user.json');

describe.only('PlusPlus', function plusPlusTest() {
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
    await db.collection('scores').remove({});
  });

  describe('getScore', function getScoreTest() {
    it('should respond with 5 reasons if the user has 5', async function respondWithScore() {
      room.user.say('matt.erickson', '@hubot score for matt.erickson');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(1000)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.match(/matt\.erickson has 227 points\.\n\n:star: Here are some reasons :star:(\n.*:.*){5}/);
    });

    it('should respond with 3 reasons if the user has 3', async function respondWithScore() {
      room.user.say('matt.erickson.min', '@hubot score for matt.erickson.min');
      // eslint-disable-next-line new-cap
      await (new Promise.delay(1000)); // wait for the db call in hubot
      expect(room.messages[1][1]).to.match(/matt\.erickson\.min has 8 points\.\n\n:star: Here are some reasons :star:(\n.*:.*){3}/);
    });
  });
});
