const TestHelper = require('hubot-test-helper');

const { H } = require('../lib/helpers');
const {
  wait,
  mockSlackClient,
  relativeTestHelperPathHelper,
} = require('../../test/test_helpers');

describe('PlusPlus', () => {
  let room;
  let plusPlusHelper;
  let emitSpy;
  beforeAll(async () => {
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
    plusPlusHelper = new TestHelper(
      relativeTestHelperPathHelper('src/messageHandlers/plusplus.js'),
    );
  });

  afterAll(async () => {});

  beforeEach(async () => {
    mockSlackClient();
    jest.mock('../lib/helpers', () => {
      const actual = jest.requireActual('../lib/helpers');
      return {
        ...actual,
        isA1Day: jest.fn().mockReturnValue(false),
      };
    });
    room = await plusPlusHelper.createRoom({ httpd: false });
    emitSpy = jest.spyOn(room.robot, 'emit');
  });

  afterEach(async () => {
    room.destroy();
  });

  describe('upOrDownVote', () => {
    describe('adding points', () => {
      it("should add a point when a user is ++'d", async () => {
        room.user.say('matt.erickson', '@derp++');
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe(
          "derp has 1 point.\n:birthday: Today is derp's hubotday! :birthday:",
        );
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).toBe(1);
      });

      it("should add a point when a user is ++'d with pre-text", async () => {
        room.user.say('matt.erickson', 'where are you d00d @derp++');
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe(
          "derp has 1 point.\n:birthday: Today is derp's hubotday! :birthday:",
        );
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
        room.user.say('matt.erickson', '@derp++ winning the business');
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toMatch(
          /derp has 1 point for winning the business\.\n:birthday: Today is derp's hubotday! :birthday:/,
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
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toMatch(/derp has 1 point\./);
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).toBe(1);
      });

      it("should add a point when a user is :thumbsup:'d", async () => {
        room.user.say('matt.erickson', '@derp :thumbsup: for being the best');
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toMatch(
          /derp has 1 point for being the best\./,
        );
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).toBe(1);
      });

      it("should add a point when a user that is already in the db is ++'d", async () => {
        room.user.say('matt.erickson.min', '@matt.erickson++');
        await wait();
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
          await wait();
          expect(room.messages.length).toBe(2);
          expect(room.messages[1].length).toBe(2);
          expect(room.messages[1][1]).toBe(
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
          await wait();
          expect(room.messages.length).toBe(2);
          expect(room.messages[1].length).toBe(2);
          expect(room.messages[1][1]).toBe(
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
          await wait();
          expect(room.messages.length).toBe(2);
          expect(room.messages[1].length).toBe(2);
          expect(room.messages[1][1]).toBe(
            '<@darf.arg> has 2 points.\n<@pirate.jack123> has 2 points.\n<@ted.phil> has 2 points.',
          );
        });
      });

      it('should add a point to user with reason', async () => {
        room.user.say(
          'matt.erickson.min',
          '@matt.erickson++ for being awesome',
        );
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe(
          '<@matt.erickson> has 228 points, 2 of which are for being awesome.',
        );
      });

      it('should add a point to user with (sans) conjunction reason', async () => {
        room.user.say(
          'matt.erickson.min',
          "@matt.erickson++ gawd you're awesome",
        );
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe(
          "<@matt.erickson> has 228 points, 1 of which is for gawd you're awesome.",
        );
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
        await wait();
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
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe(
          '<@matt.erickson.min> has 7 points, -1 of which is for being the best.',
        );
        const user = await db
          .collection('scores')
          .findOne({ name: 'matt.erickson.min' });
        expect(user.score).toBe(7);
      });

      it("shouldn't remove a point when a user is ++'d with pre-text and no conjunction", async () => {
        room.user.say(
          'matt.erickson',
          'hello, @derp -- i have no idea what you are doing',
        );
        await wait();
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
