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
  let spies = {};
  let ReactionService;
  beforeAll(async () => {
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
  });

  afterAll(async () => {});

  beforeEach(async () => {
    mockSlackClient();
    jest.mock('../lib/services/reactionService', () => {
      const actual = jest.requireActual('../lib/services/reactionService');
      return {
        ...actual,
        addPlusPlusReaction: jest.fn(),
      };
    });
    ReactionService = require('../lib/services/reactionService');

    jest.mock('../lib/helpers', () => {
      const actual = jest.requireActual('../lib/helpers');
      return {
        ...actual,
        isA1Day: jest.fn().mockReturnValue(false),
      };
    });
    plusPlusHelper = new TestHelper(
      relativeTestHelperPathHelper('src/messageHandlers/plusplus.js'),
    );
    room = await plusPlusHelper.createRoom({ httpd: false });
    room.options = { token: 'mock-token' };
    spies.emit = jest.spyOn(room.robot, 'emit');
    spies.on = jest.spyOn(room.robot, 'on');
    spies.send = jest.spyOn(room.robot, 'send');
  });

  afterEach(async () => {
    room.destroy();
  });

  describe('upOrDownVote', () => {
    describe('adding points', () => {
      it("derp should add a point when a user is ++'d", async () => {
        await room.user.say('matt.erickson', '@derp++');
        await wait();

        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe(
          "derp has 1 point.\n:birthday: Today is derp's hubotday! :birthday:",
        );
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).toBe(1);
      });

      describe('when --silent or -s', () => {
        it('should add a point but not send the message w/ -s', async () => {
          const beforeUser = await db
            .collection('scores')
            .findOne({ name: 'derpy' });
          expect(beforeUser).toBeNull();

          await room.user.say('matt.erickson', '@derpy++ -s');
          await wait();

          expect(room.messages.length).toBe(1);
          expect(room.messages[0].length).toBe(2);

          expect(ReactionService.addPlusPlusReaction).toHaveBeenCalled();
          expect(ReactionService.addPlusPlusReaction.mock.calls.length).toEqual(
            1,
          );
          expect(ReactionService.addPlusPlusReaction).toHaveBeenCalledWith(
            expect.any(Object),
            '-s',
          );
          expect(spies.send).not.toHaveBeenCalled();

          const user = await db.collection('scores').findOne({ name: 'derpy' });
          expect(user.score).toBe(1);
        });

        it('should add a point but not send the message w/ --silent', async () => {
          const beforeUser = await db
            .collection('scores')
            .findOne({ name: 'kreg' });
          expect(beforeUser).toBeNull();

          await room.user.say('phil.johnson', '@kreg++ --silent');
          await wait();

          expect(room.messages.length).toBe(1);
          expect(room.messages[0].length).toBe(2);

          expect(ReactionService.addPlusPlusReaction).toHaveBeenCalled();
          expect(ReactionService.addPlusPlusReaction.mock.calls.length).toEqual(
            1,
          );
          expect(ReactionService.addPlusPlusReaction).toHaveBeenCalledWith(
            expect.any(Object),
            '--silent',
          );
          expect(spies.send).not.toHaveBeenCalled();

          const user = await db.collection('scores').findOne({ name: 'kreg' });
          expect(user.score).toBe(1);
        });

        it('should add a point but not send the message w/ --silent and a reason', async () => {
          const beforeUser = await db
            .collection('scores')
            .findOne({ name: 'john' });
          expect(beforeUser).toBeNull();

          await room.user.say(
            'phil.johnson',
            '@john++  for being awesome --silent',
          );
          await wait();

          expect(room.messages.length).toBe(1);
          expect(room.messages[0].length).toBe(2);

          expect(ReactionService.addPlusPlusReaction).toHaveBeenCalled();
          expect(ReactionService.addPlusPlusReaction.mock.calls.length).toEqual(
            1,
          );
          expect(ReactionService.addPlusPlusReaction).toHaveBeenCalledWith(
            expect.any(Object),
            '--silent',
          );
          expect(spies.send).not.toHaveBeenCalled();

          const user = await db.collection('scores').findOne({ name: 'john' });
          expect(user.score).toBe(1);
        });
      });

      it("should add a point when a user is ++'d with pre-text", async () => {
        await room.user.say('matt.erickson', 'where are you d00d @derp++');
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe(
          "derp has 1 point.\n:birthday: Today is derp's hubotday! :birthday:",
        );
        expect(spies.emit).not.toHaveBeenCalledWith('plus-plus-failure', {
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
        await room.user.say('matt.erickson', '@derp++ winning the business');
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toMatch(
          /derp has 1 point for winning the business\.\n:birthday: Today is derp's hubotday! :birthday:/,
        );
        expect(spies.emit).not.toHaveBeenCalledWith('plus-plus-failure', {
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
        await room.user.say('matt.erickson', '@derp :clap:');
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toMatch(/derp has 1 point\./);
        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user.score).toBe(1);
      });

      it("should add a point when a user is :thumbsup:'d", async () => {
        await room.user.say(
          'matt.erickson',
          '@derp :thumbsup: for being the best',
        );
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
        await room.user.say('matt.erickson.min', '@matt.erickson++');
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
          await room.user.say('matt.erickson', '{ @darf, @greg, @tank }++');
          await wait();
          expect(room.messages.length).toBe(2);
          expect(room.messages[1].length).toBe(2);
          expect(room.messages[1][1]).toBe(
            '<@darf> has -1 point.' +
              '\n<@greg> has -9 points.' +
              '\n<@tank> has 2 points.',
          );
        });

        it('should handle multiple user scores all the way to the plusplus event', async () => {
          const capRobotName = H.capitalizeFirstLetter(room.robot.name);
          const sender = 'matt.erickson';
          const recipients = ['the.thing', 'sends.the.event'];
          await room.user.say(
            sender,
            `{ @${recipients[0]}, @${recipients[1]} }++`,
          );
          await wait();
          expect(room.messages.length).toBe(2);
          expect(room.robot.emit).toHaveBeenCalledWith(
            'plus-plus',
            expect.any(Array),
          );

          const scores = room.robot.emit.mock.calls[0][1];

          expect(scores[0].notificationMessage).toEqual(
            `<@${sender}> sent a ${capRobotName} point to ${recipients[0]} in <#${room.name}>`,
          );
          expect(scores[1].notificationMessage).toEqual(
            `<@${sender}> sent a ${capRobotName} point to ${recipients[1]} in <#${room.name}>`,
          );
        });

        it('should add a point to each user in the multi-user plus plus with text before it', async () => {
          await room.user.say(
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
          await room.user.say(
            'matt.erickson',
            '{ @darf.arg, @pirate.jack123, @ted.phil } ++',
          );
          await wait();
          expect(room.messages.length).toBe(2);
          expect(room.messages[1].length).toBe(2);
          expect(room.messages[1][1]).toEqual(`<@darf.arg> has 2 points.
<@pirate.jack123> has 2 points.
<@ted.phil> has 2 points.`);
        });
      });

      it('should add a point to user with reason', async () => {
        await room.user.say(
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
        await room.user.say(
          'matt.erickson.min',
          "@matt.erickson++ gawd you're awesome",
        );
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        expect(room.messages[1][1]).toBe(
          "<@matt.erickson> has 228 points, 1 of which is for gawd you're awesome.",
        );
        expect(spies.emit).not.toHaveBeenCalledWith('plus-plus-failure', {
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
        await room.user.say('matt.erickson', '@matt.erickson.min--');
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
        await room.user.say(
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
        await room.user.say(
          'matt.erickson',
          'hello, @derp -- i have no idea what you are doing',
        );
        await wait(2000);
        expect(spies.emit).toHaveBeenCalled();
        expect(spies.emit.mock.calls[0][0]).toEqual('plus-plus-failure');
        expect(spies.emit.mock.calls[0][1]).toEqual({
          notificationMessage:
            'False positive detected in <#room1> from <@matt.erickson>:\n' +
            'Has Pre-Message: [true].\n' +
            'Has Conjunction: [false].\n' +
            'Has Reason: [true].\n' +
            '\n' +
            '<Message Redacted For Security>\n' +
            '\n' +
            'It was a short message (<150)',
          room: '<#room1>',
        });

        const user = await db.collection('scores').findOne({ name: 'derp' });
        expect(user).toBeNull();
      });
    });
  });
});
