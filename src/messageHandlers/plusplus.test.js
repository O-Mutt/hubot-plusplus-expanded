const chai = require('chai');
chai.use(require('sinon-chai'));
const sinon = require('sinon');

const { expect } = chai;

const { MongoClient } = require('mongodb');
const mongoUnit = require('mongo-unit');
const TestHelper = require('hubot-test-helper');
const SlackClient = require('@slack/client');

const Helpers = require('../lib/Helpers');
const { wait } = require('../../test/test_helpers');
const testData = require('../../test/mockData');

describe('PlusPlus', () => {
  let room;
  let db;
  let plusPlusHelper;
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
    plusPlusHelper = new TestHelper('./messageHandlers/plusplus.js');
  });

  after(async () => {
    sinon.restore();
  });

  beforeEach(async () => {
    sinon
      .stub(SlackClient, 'WebClient')
      .withArgs('token')
      .returns({
        users: {
          info: sinon
            .stub()
            .returns({ user: { profile: { email: 'test@email.com' } } }),
        },
      });
    sinon.stub(Helpers, 'isA1Day').returns(false);
    room = plusPlusHelper.createRoom({ httpd: false });
    return mongoUnit.load(testData);
  });

  afterEach(async () => {
    sinon.restore();
    room.destroy();
    return mongoUnit.drop();
  });

  describe('upOrDownVote', () => {
    describe('adding points', () => {
      it("should add a point when a user is ++'d", async () => {
        room.user.say('matt.erickson', '@derp++');
        await wait(55);
        expect(room.messages.length).to.equal(2);
        expect(room.messages[1].length).to.equal(2);
        expect(room.messages[1][1]).to.equal(
          "derp has 1 point.\n:birthday: Today is derp's hubotday! :birthday:",
        );
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).to.equal(1);
      });

      it("should add a point when a user is ++'d with pre-text", async () => {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('matt.erickson', 'where are you d00d @derp++');
        await wait(55);
        expect(room.messages.length).to.equal(2);
        expect(room.messages[1].length).to.equal(2);
        expect(room.messages[1][1]).to.equal(
          "derp has 1 point.\n:birthday: Today is derp's hubotday! :birthday:",
        );
        expect(emitSpy).not.to.have.been.calledWith('plus-plus-failure', {
          notificationMessage:
            'False positive detected in <#room1> from <@matt.erickson>:\n' +
            'Pre-Message text: [true].\n' +
            'Missing Conjunction: [false]\n' +
            '\n' +
            'where are you d00d @derp++',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).not.to.equal(undefined);
        expect(user.score).to.equal(1);
      });

      it("should add a point when a user is ++'d without a conjunction", async () => {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('matt.erickson', '@derp++ winning the business');
        await wait(55);
        expect(room.messages.length).to.equal(2);
        expect(room.messages[1].length).to.equal(2);
        expect(room.messages[1][1]).to.match(
          /derp has 1 point for winning the business\.\n:birthday: Today is derp's hubotday! :birthday:/,
        );
        expect(emitSpy).not.to.have.been.calledWith('plus-plus-failure', {
          notificationMessage:
            'False positive detected in <#room1> from <@matt.erickson>:\n' +
            'Pre-Message text: [false].\n' +
            'Missing Conjunction: [true]\n' +
            '\n' +
            '@derp++ winning the business',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).not.to.equal(undefined);
        expect(user.score).to.equal(1);
      });

      it("should add a point when a user is :clap:'d", async () => {
        room.user.say('matt.erickson', '@derp :clap:');
        await wait(55);
        expect(room.messages.length).to.equal(2);
        expect(room.messages[1].length).to.equal(2);
        expect(room.messages[1][1]).to.match(/derp has 1 point\./);
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).to.equal(1);
      });

      it("should add a point when a user is :thumbsup:'d", async () => {
        room.user.say('matt.erickson', '@derp :thumbsup: for being the best');
        await wait(55);
        expect(room.messages.length).to.equal(2);
        expect(room.messages[1].length).to.equal(2);
        expect(room.messages[1][1]).to.match(
          /derp has 1 point for being the best\./,
        );
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).to.equal(1);
      });

      it("should add a point when a user that is already in the db is ++'d", async () => {
        room.user.say('matt.erickson.min', '@matt.erickson++');
        await wait(55);
        expect(room.messages.length).to.equal(2);
        expect(room.messages[1].length).to.equal(2);
        expect(room.messages[1][1]).to.equal(
          '<@matt.erickson> has 228 points.',
        );
        const user = await db
          .collection('scores')
          .findOne({ name: 'matt.erickson' });
        expect(user.score).to.equal(228);
      });

      describe('multi user vote', () => {
        it('should add a point to each user in the multi-user plus plus', async () => {
          room.user.say('matt.erickson', '{ @darf, @greg, @tank }++');
          await wait(55);
          expect(room.messages.length).to.equal(2);
          expect(room.messages[1].length).to.equal(2);
          expect(room.messages[1][1]).to.equal(
            '<@darf> has -1 point.' +
              '\n<@greg> has -9 points.' +
              '\n<@tank> has 2 points.',
          );
        });

        it('should add a point to each user in the multi-user plus plus with text before it', async () => {
          room.user.say(
            'matt.erickson',
            'hello world! { @darf, @greg, @tank }++',
          );
          await wait(55);
          expect(room.messages.length).to.equal(2);
          expect(room.messages[1].length).to.equal(2);
          expect(room.messages[1][1]).to.equal(
            '<@darf> has -1 point.' +
              '\n<@greg> has -9 points.' +
              '\n<@tank> has 2 points.',
          );
        });

        it('should add a point to each user in the multi-user plus plus with periods in their names', async () => {
          room.user.say(
            'matt.erickson',
            '{ @darf.arg, @pirate.jack123, @ted.phil } ++',
          );
          await wait(55);
          expect(room.messages.length).to.equal(2);
          expect(room.messages[1].length).to.equal(2);
          expect(room.messages[1][1]).to.equal(
            '<@darf.arg> has 2 points.\n<@pirate.jack123> has 2 points.\n<@ted.phil> has 2 points.',
          );
        });
      });

      it('should add a point to user with reason', async () => {
        room.user.say(
          'matt.erickson.min',
          '@matt.erickson++ for being awesome',
        );
        await wait(55);
        expect(room.messages.length).to.equal(2);
        expect(room.messages[1].length).to.equal(2);
        expect(room.messages[1][1]).to.equal(
          '<@matt.erickson> has 228 points, 2 of which are for being awesome.',
        );
      });

      it('should add a point to user with (sans) conjunction reason', async () => {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say(
          'matt.erickson.min',
          "@matt.erickson++ gawd you're awesome",
        );
        await wait(55);
        expect(room.messages.length).to.equal(2);
        expect(room.messages[1].length).to.equal(2);
        expect(room.messages[1][1]).to.equal(
          "<@matt.erickson> has 228 points, 1 of which is for gawd you're awesome.",
        );
        expect(emitSpy).not.to.have.been.calledWith('plus-plus-failure', {
          notificationMessage:
            'False positive detected in <#room1> from <@derp>:\n' +
            'Pre-Message text: [false].\n' +
            'Missing Conjunction: [true]\n' +
            '\n' +
            "@matt.erickson++ gawd you're awesome",
          room: 'room1',
        });
      });
    });

    describe('subtract points', () => {
      it("should subtract a point when a user that is already in the db is --'d", async () => {
        let user = await db
          .collection('scores')
          .findOne({ name: 'matt.erickson.min' });
        expect(user.score).to.equal(8);
        room.user.say('matt.erickson', '@matt.erickson.min--');
        await wait(55);
        expect(room.messages.length).to.equal(2);
        expect(room.messages[1].length).to.equal(2);
        expect(room.messages[1][1]).to.equal(
          '<@matt.erickson.min> has 7 points.',
        );
        user = await db
          .collection('scores')
          .findOne({ name: 'matt.erickson.min' });
        expect(user.score).to.equal(7);
      });

      it("should subtract a point when a user is :thumbsdown:'d", async () => {
        room.user.say(
          'matt.erickson',
          '@matt.erickson.min :thumbsdown: for being the best',
        );
        await wait(55);
        expect(room.messages.length).to.equal(2);
        expect(room.messages[1].length).to.equal(2);
        expect(room.messages[1][1]).to.equal(
          '<@matt.erickson.min> has 7 points, -1 of which is for being the best.',
        );
        const user = await db
          .collection('scores')
          .findOne({ name: 'matt.erickson.min' });
        expect(user.score).to.equal(7);
      });

      it("shouldn't remove a point when a user is ++'d with pre-text and no conjunction", async () => {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say(
          'matt.erickson',
          'hello, @derp -- i have no idea what you are doing',
        );
        await wait(55);
        expect(emitSpy).to.have.been.calledWith('plus-plus-failure', {
          notificationMessage:
            'False positive detected in <#room1> from <@matt.erickson>\n' +
            'Has pre-Message text: [true].\n' +
            'Missing Conjunction: [true]\n' +
            '\n' +
            '<redacted message> It was a short message (<150)',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).to.equal(null);
      });
    });
  });
});
