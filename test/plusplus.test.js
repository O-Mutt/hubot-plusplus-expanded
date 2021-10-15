const chai = require('chai');
chai.use(require('sinon-chai'));
const sinon = require('sinon');

const { expect } = chai;

const { MongoClient } = require('mongodb');
const mongoUnit = require('mongo-unit');
const Helper = require('hubot-test-helper');
const SlackClient = require('@slack/client');
const DatabaseService = require('../src/lib/services/database');

const helpers = require('../src/lib/helpers');
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

  after(async function () {
    sinon.restore();
  });

  beforeEach(async function () {
    sinon.stub(SlackClient, 'WebClient').withArgs('token').returns({
      users: {
        info: sinon.stub().returns({ user: { profile: { email: 'test@email.com' } } }),
      },
    });
    room = plusPlusHelper.createRoom();
    return mongoUnit.load(testData);
  });

  afterEach(async function () {
    sinon.restore();
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

      it('should add a point when a user is ++\'d with pre-text', async function () {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('matt.erickson', 'where are you d00d @derp++');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(room.messages[1][1]).to.match(/derp has 1 point\.\n:birthday: Today is derp's hubotday! :birthday:/);
        expect(emitSpy).not.to.have.been.calledWith('plus-plus-failure', {
          notificationMessage: 'False positive detected in <#room1> from <@matt.erickson>:\n'
            + 'Pre-Message text: [true].\n'
            + 'Missing Conjunction: [false]\n'
            + '\n'
            + 'where are you d00d @derp++',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).not.to.equal(undefined);
        expect(user.score).to.equal(1);
      });

      it('should add a point when a user is ++\'d without a conjunction', async function () {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('matt.erickson', '@derp++ winning the business');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(room.messages[1][1]).to.match(/derp has 1 point for winning the business\.\n:birthday: Today is derp's hubotday! :birthday:/);
        expect(emitSpy).not.to.have.been.calledWith('plus-plus-failure', {
          notificationMessage: 'False positive detected in <#room1> from <@matt.erickson>:\n'
            + 'Pre-Message text: [false].\n'
            + 'Missing Conjunction: [true]\n'
            + '\n'
            + '@derp++ winning the business',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).not.to.equal(undefined);
        expect(user.score).to.equal(1);
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
        room.user.say('matt.erickson.min', '@matt.erickson++');
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
        room.user.say('matt.erickson.min', '@matt.erickson++ for being awesome');
        await new Promise((resolve) => setTimeout(resolve, 60));
        expect(room.messages[1][1]).to.match(
          /<@matt\.erickson> has 228 points, 2 of which are for being awesome./,
        );
      });

      it('should add a point to user with (sans) conjunction reason', async function () {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('matt.erickson.min', '@matt.erickson++ gawd you\'re awesome');
        await new Promise((resolve) => setTimeout(resolve, 60));
        expect(room.messages[1][1]).to.match(
          /<@matt\.erickson> has 228 points, 1 of which is for gawd you're awesome./,
        );
        expect(emitSpy).not.to.have.been.calledWith('plus-plus-failure', {
          notificationMessage: 'False positive detected in <#room1> from <@derp>:\n'
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
        room.user.say('matt.erickson', '@matt.erickson.min--');
        await new Promise((resolve) => setTimeout(resolve, 45));
        expect(room.messages[1][1]).to.match(/<@matt.erickson.min> has 7 points\./);
        user = await db.collection('scores').findOne({ name: 'matt.erickson.min' });
        expect(user.score).to.equal(7);
      });

      it('should subtract a point when a user is :thumbsdown:\'d', async function () {
        room.user.say('matt.erickson', '@matt.erickson.min :thumbsdown: for being the best');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(room.messages[1][1]).to.equal('<@matt.erickson.min> has 7 points, -1 of which is for being the best.');
        const user = await db.collection('scores').findOne({ name: 'matt.erickson.min' });
        expect(user.score).to.equal(7);
      });

      it('shouldn\'t remove a point when a user is ++\'d with pre-text and no conjunction', async function () {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('matt.erickson', 'hello, @derp -- i have no idea what you are doing');
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(emitSpy).to.have.been.calledWith('plus-plus-failure', {
          notificationMessage: 'False positive detected in <#room1> from <@matt.erickson>:\n'
            + 'Pre-Message text: [true].\n'
            + 'Missing Conjunction: [true]\n'
            + '\n'
            + 'hello, @derp -- i have no idea what you are doing',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).to.equal(undefined);
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
      process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = url;
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
});
