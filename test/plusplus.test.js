const chai = require('chai');
chai.use(require('sinon-chai'));
const sinon = require('sinon');

const { expect } = chai;

const { MongoClient } = require('mongodb');
const mongoUnit = require('mongo-unit');
const Helper = require('hubot-test-helper');

const helpers = require('../src/helpers');
const pjson = require('../package.json');

const testData = require('./mockData');

describe('PlusPlus', function () {
  let room;
  let db;
  let plusPlusHelper;
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
    plusPlusHelper = new Helper('../src/plusplus.js');
  });

  beforeEach(async function () {
    sandbox = sinon.createSandbox();
    room = plusPlusHelper.createRoom();
    return mongoUnit.load(testData);
  });

  afterEach(async function () {
    sandbox.restore();
    room.destroy();
    return mongoUnit.drop();
  });

  describe('upOrDownVote', function () {
    describe('adding points', function () {
      it('should add a point when a user is ++\'d', async function () {
        room.user.say('matt.erickson', '@derp++');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(room.messages[1][1]).to.match(/derp has 1 point\./);
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).to.equal(1);
      });

      it('shouldn\'t add a point when a user is ++\'d with pre-text', async function () {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('matt.erickson', 'where are you d00d @derp++');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(emitSpy).to.have.been.calledWith('plus-plus', {
          notificationMessage: 'False positive detected:\n'
            + 'Pre-Message text: [true].\n'
            + 'Missing Conjunction: [false]\n'
            + '\n'
            + 'where are you d00d @derp++',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).to.equal(undefined);
      });

      it('shouldn\'t add a point when a user is ++\'d without a conjunction', async function () {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('matt.erickson', '@derp++ winning the business');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(emitSpy).to.have.been.calledWith('plus-plus', {
          notificationMessage: 'False positive detected:\n'
            + 'Pre-Message text: [false].\n'
            + 'Missing Conjunction: [true]\n'
            + '\n'
            + '@derp++ winning the business',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).to.equal(undefined);
      });

      it('should add a point when a user is :clap:\'d', async function () {
        room.user.say('matt.erickson', '@derp :clap:');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(room.messages[1][1]).to.match(/derp has 1 point\./);
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).to.equal(1);
      });

      it('should add a point when a user is :thumbsup:\'d', async function () {
        room.user.say('matt.erickson', '@derp :thumbsup: for being the best');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(room.messages[1][1]).to.match(/derp has 1 point for being the best\./);
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).to.equal(1);
      });

      it('should add a point when a user that is already in the db is ++\'d', async function () {
        room.user.say('derp', '@matt.erickson++');
        await new Promise((resolve) => setTimeout(resolve, 45));
        expect(room.messages[1][1]).to.match(/<@matt.erickson> has 228 points\./);
        const user = await db
          .collection('scores')
          .findOne({ name: 'matt.erickson' });
        expect(user.score).to.equal(228);
      });

      describe.skip('multi user vote', function () {
        it('should add a point to each user in the multi-user plus plus', async function () {
          room.user.say('derp', '{ @darf, @greg, @tank } ++');
          await new Promise((resolve) => setTimeout(resolve, 50));
          expect(room.messages[1][1]).to.match(
            /darf has 1 point\.\n:birthday: Today is darf's hubotday! :birthday:\ngreg has 1 point\.\n:birthday: Today is greg's hubotday! :birthday:\ntank has 1 point\.\n:birthday: Today is tank's hubotday! :birthday:/,
          );
        });

        it('should add a point to each user in the multi-user plus plus with text before it', async function () {
          room.user.say('derp', 'hello world! { @darf, @greg, @tank } ++');
          await new Promise((resolve) => setTimeout(resolve, 50));
          expect(room.messages[1][1]).to.match(
            /darf has 1 point\.\n:birthday: Today is darf's hubotday! :birthday:\ngreg has 1 point\.\n:birthday: Today is greg's hubotday! :birthday:\ntank has 1 point\.\n:birthday: Today is tank's hubotday! :birthday:/,
          );
        });

        it('should add a point to each user in the multi-user plus plus with periods in their names', async function () {
          room.user.say('derp', '{ @darf.arg, @pirate.jack123, @ted.phil } ++');
          await new Promise((resolve) => setTimeout(resolve, 50));
          expect(room.messages[1][1]).to.match(
            /darf.arg has 1 point\.\n:birthday: Today is darf.arg's hubotday! :birthday:\npirate.jack123 has 1 point\.\n:birthday: Today is pirate.jack123's hubotday! :birthday:\nted.phil has 1 point\.\n:birthday: Today is ted.phil's hubotday! :birthday:/,
          );
        });
      });

      it('should add a point to user with reason', async function () {
        room.user.say('derp', '@matt.erickson++ for being awesome');
        await new Promise((resolve) => setTimeout(resolve, 60));
        expect(room.messages[1][1]).to.match(
          /<@matt\.erickson> has 228 points, 2 of which are for being awesome./,
        );
      });

      it('shouldn\'t add a point to user with (sans) conjunction reason', async function () {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('derp', '@matt.erickson++ gawd you\'re awesome');
        await new Promise((resolve) => setTimeout(resolve, 60));
        expect(emitSpy).to.have.been.calledWith('plus-plus', {
          notificationMessage: 'False positive detected:\n'
            + 'Pre-Message text: [false].\n'
            + 'Missing Conjunction: [true]\n'
            + '\n'
            + "@matt.erickson++ gawd you're awesome",
          room: 'room1',
        });
      });
    });

    describe('subtract points', function () {
      it('should subtract a point when a user that is already in the db is --\'d', async function () {
        let user = await db
          .collection('scores')
          .findOne({ name: 'matt.erickson.min' });
        expect(user.score).to.equal(8);
        room.user.say('derp', '@matt.erickson.min--');
        await new Promise((resolve) => setTimeout(resolve, 45));
        expect(room.messages[1][1]).to.match(/<@matt.erickson.min> has 7 points\./);
        user = await db.collection('scores').findOne({ name: 'matt.erickson' });
        expect(user.score).to.equal(227);
      });

      it('should subtract a point when a user is :thumbsdown:\'d', async function () {
        room.user.say('matt.erickson', '@derp :thumbsdown: for being the best');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(room.messages[1][1]).to.equal('derp has -1 point for being the best.\n:birthday: Today is derp\'s hubotday! :birthday:');
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).to.equal(-1);
      });
    });
  });

  describe('giveTokenBetweenUsers', function () {
    it('should add a X points when a user is + #\'d', async function () {
      room.user.say('peter.parker', '@hubot @peter.parker.min + 5');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(room.messages[1][1]).to.equal('<@peter.parker> transferred *5* hubot Tokens to <@peter.parker.min>.\n<@peter.parker.min> now has 13 tokens.\n_<@peter.parker> has 195 tokens_');
      const to = await db.collection('scores').findOne({ name: 'peter.parker.min' });
      expect(to.score).to.equal(8);
      expect(to.token).to.equal(13);
      const from = await db.collection('scores').findOne({ name: 'peter.parker' });
      expect(from.score).to.equal(200);
      expect(from.token).to.equal(195);
    });

    it('should error and message if sender is short on tokens', async function () {
      room.user.say('peter.parker.min', '@hubot @peter.parker + 55');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(room.messages[1][1]).to.match(/You don't have enough tokens to send 55 to peter.parker/);
      const to = await db.collection('scores').findOne({ name: 'peter.parker' });
      expect(to.score).to.equal(200);
      expect(to.token).to.equal(200);
      const from = await db.collection('scores').findOne({ name: 'peter.parker.min' });
      expect(from.score).to.equal(8);
      expect(from.token).to.equal(8);
    });

    it('should error and message if sender is not level 2', async function () {
      room.user.say('matt.erickson.min', '@hubot @peter.parker + 55');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(room.messages[1][1]).to.match(/In order to send tokens to peter\.parker you both must be, at least, level 2\./);
      const to = await db.collection('scores').findOne({ name: 'peter.parker' });
      expect(to.score).to.equal(200);
      expect(to.token).to.equal(200);
      const from = await db.collection('scores').findOne({ name: 'matt.erickson.min' });
      expect(from.score).to.equal(8);
      expect(from.token).to.equal(undefined);
    });

    it('should error and message if recipient is not level 2', async function () {
      room.user.say('peter.parker', '@hubot @matt.erickson + 55');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(room.messages[1][1]).to.match(/In order to send tokens to matt\.erickson you both must be, at least, level 2\./);
      const to = await db.collection('scores').findOne({ name: 'matt.erickson' });
      expect(to.score).to.equal(227);
      expect(to.token).to.equal(undefined);
      const from = await db.collection('scores').findOne({ name: 'peter.parker' });
      expect(from.score).to.equal(200);
      expect(from.token).to.equal(200);
    });

    it('should error on second point (for spam check)', async function () {
      room.user.say('peter.parker', '@hubot @peter.parker.min + 2');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(room.messages[1][1]).to.equal('<@peter.parker> transferred *2* hubot Tokens to <@peter.parker.min>.\n<@peter.parker.min> now has 10 tokens.\n_<@peter.parker> has 198 tokens_');
      const to = await db.collection('scores').findOne({ name: 'peter.parker.min' });
      expect(to.score).to.equal(8);
      expect(to.token).to.equal(10);
      const from = await db.collection('scores').findOne({ name: 'peter.parker' });
      expect(from.score).to.equal(200);
      expect(from.token).to.equal(198);
      room.user.say('peter.parker', '@hubot @peter.parker.min + 2');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(room.messages[3][1]).to.equal("I'm sorry peter.parker, I'm afraid I can't do that.");
    });
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

  describe('respondWithHubotGuidance', function () {
    it('should respond with hubot usage guidance', async function () {
      room.user.say('peter.nguyen', '@hubot help');
      await new Promise((resolve) => setTimeout(resolve, 45));
      const message = room.messages[1][1];
      const { blocks } = message.attachments[0];
      expect(blocks.length).to.equal(3);
      expect(blocks[0]).to.deep.include({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Need help with hubot?',
        },
      });
      expect(blocks[1]).to.deep.include({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_Commands_:',
        },
      });
      expect(blocks[2]).to.be.an('object');
    });

    it('should respond with hubot usage guidance and further URL if env var is set', async function () {
      const url = 'https://derp.com';
      room.destroy();
      sandbox.stub(process.env, 'HUBOT_CRYPTO_FURTHER_HELP_URL').value(url);
      room = plusPlusHelper.createRoom();
      room.user.say('peter.nguyen', '@hubot -h');
      await new Promise((resolve) => setTimeout(resolve, 45));
      const message = room.messages[1][1];
      const { blocks } = message.attachments[0];
      expect(blocks.length).to.equal(4);
      expect(blocks[0]).to.deep.include({
        type: 'section',
        text: { type: 'mrkdwn', text: 'Need help with hubot?' },
      });
      expect(blocks[1]).to.deep.include({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_Commands_:',
        },
      });
      expect(blocks[2]).to.be.an('object');
      expect(blocks[3]).to.deep.include({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `For further help please visit ${url}`,
        },
      });
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

  describe('version', function () {
    it('should respond with the name and version of the package when asked --version', async function () {
      await room.user.say('matt.erickson', '@hubot --version');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        `${helpers.capitalizeFirstLetter(room.robot.name)} ${pjson.name}, version: ${pjson.version}`,
      );
    });

    it('should respond with the name and version of the package when asked -v', async function () {
      await room.user.say('matt.erickson', '@hubot -v');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        `${helpers.capitalizeFirstLetter(room.robot.name)} ${pjson.name}, version: ${pjson.version}`,
      );
    });

    it('should respond with the name and version of the package when asked `plusplus version`', async function () {
      await room.user.say('matt.erickson', '@hubot plusplus version');
      await new Promise((resolve) => setTimeout(resolve, 45));
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        `${helpers.capitalizeFirstLetter(room.robot.name)} ${pjson.name}, version: ${pjson.version}`,
      );
    });
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
