const sinon = require('sinon');

const TestHelper = require('hubot-test-helper');
const SlackClient = require('@slack/client');

const { H } = require('../lib/helpers');
const { wait } = require('../../test/test_helpers');

describe('PlusPlus', () => {
  let room;
  let plusPlusHelper;
  beforeAll(async () => {
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
    plusPlusHelper = new TestHelper('./messageHandlers/plusplus.js');
  });

  afterAll(async () => {
    sinon.restore();
  });

  beforeEach(() => {
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
    sinon.stub(H, 'isA1Day').returns(false);
    room = plusPlusHelper.createRoom({ httpd: false });
  });

  afterEach(async () => {
    sinon.restore();
    room.destroy();
  });

  describe('upOrDownVote', () => {
    describe('adding points', () => {
      it("should add a point when a user is ++'d", async () => {
        room.user.say('matt.erickson', '@derp++');
        await wait(55);
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe("derp has 1 point.\n:birthday: Today is derp's hubotday! :birthday:");
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).toBe(1);
      });

      it("should add a point when a user is ++'d with pre-text", async () => {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('matt.erickson', 'where are you d00d @derp++');
        await wait(55);
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe("derp has 1 point.\n:birthday: Today is derp's hubotday! :birthday:");
        expect(emitSpy).not.toHaveBeenCalledWith('plus-plus-failure', {
          notificationMessage:
            'False positive detected in <#room1> from <@matt.erickson>:\n' +
            'Pre-Message text: [true].\n' +
            'Missing Conjunction: [false]\n' +
            '\n' +
            'where are you d00d @derp++',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).toBeDefined();
        expect(user.score).toBe(1);
      });

      it("should add a point when a user is ++'d without a conjunction", async () => {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say('matt.erickson', '@derp++ winning the business');
        await wait(55);
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toMatch(
          /derp has 1 point for winning the business\.\n:birthday: Today is derp's hubotday! :birthday:/
        );
        expect(emitSpy).not.toHaveBeenCalledWith('plus-plus-failure', {
          notificationMessage:
            'False positive detected in <#room1> from <@matt.erickson>:\n' +
            'Pre-Message text: [false].\n' +
            'Missing Conjunction: [true]\n' +
            '\n' +
            '@derp++ winning the business',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).toBeDefined();
        expect(user.score).toBe(1);
      });

      it("should add a point when a user is :clap:'d", async () => {
        room.user.say('matt.erickson', '@derp :clap:');
        await wait(55);
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toMatch(/derp has 1 point\./);
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).toBe(1);
      });

      it("should add a point when a user is :thumbsup:'d", async () => {
        room.user.say('matt.erickson', '@derp :thumbsup: for being the best');
        await wait(55);
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toMatch(/derp has 1 point for being the best\./);
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).toBe(1);
      });

      it("should add a point when a user that is already in the db is ++'d", async () => {
        room.user.say('matt.erickson.min', '@matt.erickson++');
        await wait(55);
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe('<@matt.erickson> has 228 points.');
        const user = await db
          .collection('scores')
          .findOne({ name: 'matt.erickson' });
        expect(user.score).toBe(228);
      });

      describe('multi user vote', () => {
        it('should add a point to each user in the multi-user plus plus', async () => {
          room.user.say('matt.erickson', '{ @darf, @greg, @tank }++');
          await wait(55);
          expect(room.messages.length).toBe(2);
          expect(room.messages[1].length).toBe(2);
          expect(room.messages[1][1]).toBe('<@darf> has -1 point.' +
            '\n<@greg> has -9 points.' +
            '\n<@tank> has 2 points.');
        });

        it('should add a point to each user in the multi-user plus plus with text before it', async () => {
          room.user.say(
            'matt.erickson',
            'hello world! { @darf, @greg, @tank }++',
          );
          await wait(55);
          expect(room.messages.length).toBe(2);
          expect(room.messages[1].length).toBe(2);
          expect(room.messages[1][1]).toBe('<@darf> has -1 point.' +
            '\n<@greg> has -9 points.' +
            '\n<@tank> has 2 points.');
        });

        it('should add a point to each user in the multi-user plus plus with periods in their names', async () => {
          room.user.say(
            'matt.erickson',
            '{ @darf.arg, @pirate.jack123, @ted.phil } ++',
          );
          await wait(55);
          expect(room.messages.length).toBe(2);
          expect(room.messages[1].length).toBe(2);
          expect(room.messages[1][1]).toBe(
            '<@darf.arg> has 2 points.\n<@pirate.jack123> has 2 points.\n<@ted.phil> has 2 points.'
          );
        });
      });

      it('should add a point to user with reason', async () => {
        room.user.say(
          'matt.erickson.min',
          '@matt.erickson++ for being awesome',
        );
        await wait(55);
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe('<@matt.erickson> has 228 points, 2 of which are for being awesome.');
      });

      it('should add a point to user with (sans) conjunction reason', async () => {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say(
          'matt.erickson.min',
          "@matt.erickson++ gawd you're awesome",
        );
        await wait(55);
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe("<@matt.erickson> has 228 points, 1 of which is for gawd you're awesome.");
        expect(emitSpy).not.toHaveBeenCalledWith('plus-plus-failure', {
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
        expect(user.score).toBe(8);
        room.user.say('matt.erickson', '@matt.erickson.min--');
        await wait(55);
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe('<@matt.erickson.min> has 7 points.');
        user = await db
          .collection('scores')
          .findOne({ name: 'matt.erickson.min' });
        expect(user.score).toBe(7);
      });

      it("should subtract a point when a user is :thumbsdown:'d", async () => {
        room.user.say(
          'matt.erickson',
          '@matt.erickson.min :thumbsdown: for being the best',
        );
        await wait(55);
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe('<@matt.erickson.min> has 7 points, -1 of which is for being the best.');
        const user = await db
          .collection('scores')
          .findOne({ name: 'matt.erickson.min' });
        expect(user.score).toBe(7);
      });

      it("shouldn't remove a point when a user is ++'d with pre-text and no conjunction", async () => {
        const emitSpy = sinon.spy(room.robot, 'emit');
        room.user.say(
          'matt.erickson',
          'hello, @derp -- i have no idea what you are doing',
        );
        await wait(55);
        expect(emitSpy).toHaveBeenCalledWith('plus-plus-failure', {
          notificationMessage:
            'False positive detected in <#room1> from <@matt.erickson>\n' +
            'Has pre-Message text: [true].\n' +
            'Missing Conjunction: [true]\n' +
            '\n' +
            '<redacted message> It was a short message (<150)',
          room: 'room1',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).toBeNull();
      });
    });
  });
});
