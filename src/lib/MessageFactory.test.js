const sinon = require('sinon');

const { subYears, addDays } = require('date-fns');

const { helpers } = require('./helpers');
const MessageFactory = require('./messageFactory');
const { nonSequiturs } = require('./static/a1');

describe('MessageFactory', () => {
  const mockRobot = { name: 'Robit' };
  const mockProcVars = { reasonsKeyword: 'reasons' };
  let notBotDay;
  let botDay;
  let instance;
  beforeEach(() => {
    instance = new MessageFactory(mockRobot);
    const mockHelpers = sinon.stub(helpers, 'decode');
    mockHelpers.returnsArg(0);
    notBotDay = addDays(subYears(new Date(), 1), 5);
    botDay = subYears(new Date(), 1);
  });

  afterEach(() => {
    helpers.decode.restore();
  });

  // This method expects base64 encoded reasons but we are stubbing out the decode method
  describe('BuildNewScoreMessage', () => {
    it("should handle undefined user, undefined reason, and print ''", () => {
      const user = undefined;
      const emptyReasons = helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(
        user,
        emptyReasons,
        mockRobot,
      );
      expect(msg).toBe('');
    });

    it('should take the user w/a single point without reasons and print their score', () => {
      const user = {
        name: 'matt',
        score: 1,
        reasons: {},
        hubotDay: notBotDay,
      };
      const emptyReasons = helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(
        user,
        emptyReasons,
        mockRobot,
      );
      expect(msg).toBe('matt has 1 point.');
    });

    it('should take the user w/2 points (plural) without reasons and print their score', () => {
      const user = {
        name: 'matt',
        score: 2,
        reasons: {},
        hubotDay: notBotDay,
      };
      const emptyReasons = helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(
        user,
        emptyReasons,
        mockRobot,
      );
      expect(msg).toBe('matt has 2 points.');
    });

    it('should take the user w/100 points (special case) and print their score as the special output', () => {
      const user = {
        name: 'matt',
        score: 100,
        reasons: {},
        hubotDay: notBotDay,
      };
      const emptyReasons = helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(
        user,
        emptyReasons,
        mockRobot,
      );
      expect(msg).toBe(':100: matt has 100 points :100:');
    });

    it('should take the user w/1000 points (special case) and print their score as the special output', () => {
      const user = {
        name: 'matt',
        score: 1000,
        reasons: {},
        hubotDay: notBotDay,
      };
      const emptyReasons = helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(
        user,
        emptyReasons,
        mockRobot,
      );
      expect(msg).toBe(':1000: matt has 1000 points :1000:');
    });

    it('should take the user w/300 points (special case) and print their score as the special output', () => {
      const user = {
        name: 'matt',
        score: 300,
        reasons: {},
        hubotDay: notBotDay,
      };
      const emptyReasons = helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(
        user,
        emptyReasons,
        mockRobot,
      );
      expect(msg).toBe(':300: matt has 300 points :300:');
    });

    it('should take the user object and reason "winning" and print the expected message', () => {
      const user = {
        name: 'matt',
        score: 45,
        reasons: { winning: 1 },
        hubotDay: notBotDay,
      };
      const reason = 'winning';
      const expectedMessage = 'matt has 45 points, 1 of which is for winning.';

      const message = MessageFactory.BuildNewScoreMessage(
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message', () => {
      const user = {
        name: 'matt',
        score: 1,
        reasons: { 'cool runnings!': 1 },
        hubotDay: notBotDay,
      };
      const reason = 'cool runnings!';
      const expectedMessage = 'matt has 1 point for cool runnings!';

      const message = MessageFactory.BuildNewScoreMessage(
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message for botDay', () => {
      const user = {
        name: 'matt',
        score: 1,
        reasons: { 'cool runnings!': 1 },
        hubotDay: botDay,
      };
      const reason = 'cool runnings!';
      const expectedMessage =
        "matt has 1 point for cool runnings!\n:birthday: Today is matt's 1st hubotday! :birthday:";

      const message = MessageFactory.BuildNewScoreMessage(
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message when no points for the reason', () => {
      const user = {
        name: 'matt',
        score: 99,
        reasons: { 'cool runnings!': 0 },
        hubotDay: notBotDay,
      };
      const reason = 'cool runnings!';
      const expectedMessage =
        'matt has 99 points, none of which are for cool runnings!';

      const message = MessageFactory.BuildNewScoreMessage(
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message when 99 points for the reason', () => {
      const user = {
        name: 'matt',
        score: 1,
        reasons: { 'cool runnings!': 99 },
        hubotDay: notBotDay,
      };
      const reason = 'cool runnings!';
      const expectedMessage =
        'matt has 1 point, 99 of which are for cool runnings!';

      const message = MessageFactory.BuildNewScoreMessage(
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message when 99 points for the reason and 145 total points', () => {
      const user = {
        name: 'matt',
        score: 145,
        reasons: { 'cool runnings!': 99 },
        hubotDay: notBotDay,
      };
      const reason = 'cool runnings!';
      const expectedMessage =
        'matt has 145 points, 99 of which are for cool runnings!';

      const message = MessageFactory.BuildNewScoreMessage(
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message when 99 points for the reason and 200 total points', () => {
      const user = {
        name: 'matt',
        score: 200,
        reasons: { 'cool runnings!': 99 },
        hubotDay: notBotDay,
      };
      const reason = 'cool runnings!';
      const expectedMessage =
        ':200: matt has 200 points :200:, 99 of which are for cool runnings!';

      const message = MessageFactory.BuildNewScoreMessage(
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object with no reasons and print the expected message', () => {
      const user = {
        name: 'matt',
        score: 0,
        reasons: {},
        hubotDay: notBotDay,
      };
      const reason = undefined;
      const expectedMessage = ':zero: matt has 0 points :zero:';

      const message = MessageFactory.BuildNewScoreMessage(
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object with multiple reasons and print the expected message for each reason', () => {
      const user = {
        name: 'matt',
        score: 50,
        reasons: {
          'cool runnings!': 10,
          winning: 2,
        },
        hubotDay: notBotDay,
      };
      const reason1 = 'cool runnings!';
      const reason2 = 'winning';
      const expectedMessage1 =
        'matt has 50 points, 10 of which are for cool runnings!';
      const expectedMessage2 =
        'matt has 50 points, 2 of which are for winning.';
      const message1 = MessageFactory.BuildNewScoreMessage(
        user,
        reason1,
        'hubot',
      );

      expect(message1).toBe(expectedMessage1);

      const message2 = MessageFactory.BuildNewScoreMessage(
        user,
        reason2,
        'hubot',
      );
      expect(message2).toBe(expectedMessage2);
    });
  });

  describe('BuildScoreLookup', () => {
    it('should respond with empty if any vars are undefined or empty', () => {
      let dummyMsg = MessageFactory.BuildScoreLookup(
        undefined,
        undefined,
        undefined,
      );
      expect(dummyMsg).toBe('');

      dummyMsg = MessageFactory.BuildScoreLookup({}, undefined, undefined);
      expect(dummyMsg).toBe('');

      dummyMsg = MessageFactory.BuildScoreLookup(undefined, {}, undefined);
      expect(dummyMsg).toBe('');

      dummyMsg = MessageFactory.BuildScoreLookup(undefined, undefined, {});
      expect(dummyMsg).toBe('');

      dummyMsg = MessageFactory.BuildScoreLookup({}, undefined, {});
      expect(dummyMsg).toBe('');

      dummyMsg = MessageFactory.BuildScoreLookup({}, {}, undefined);
      expect(dummyMsg).toBe('');

      dummyMsg = MessageFactory.BuildScoreLookup(undefined, {}, {});
      expect(dummyMsg).toBe('');

      dummyMsg = MessageFactory.BuildScoreLookup({}, {}, {});
      expect(dummyMsg).toBe('');
    });

    it('should respond with 5 reasons if the user has 5 or more', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockFullUser.json');
      const scoreMs = MessageFactory.BuildScoreLookup(
        baseUser,
        mockRobot,
        mockProcVars,
      );
      expect(scoreMs).toMatch(new RegExp(
        `^<@${baseUser.name}> has ${baseUser.score} points.` +
          `\nAccount Level: ${baseUser.accountLevel}` +
          `\nTotal Points Given: ${baseUser.totalPointsGiven}` +
          '\n\n:star: Here are some reasons :star:' +
          '(\n.*:.*){5}$',
      ));
    });

    it('should respond with score and no reasons if the user has no reasons', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockMultiUser1.json');
      const scoreMs = MessageFactory.BuildScoreLookup(
        baseUser,
        mockRobot,
        mockProcVars,
      );
      expect(scoreMs).toBe(`<@${baseUser.name}> has ${baseUser.score} points.` +
        `\nAccount Level: ${baseUser.accountLevel}` +
        `\nTotal Points Given: ${baseUser.totalPointsGiven}`);
    });

    it('should respond with 3 reasons if the user has 3', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockMinimalUser.json');
      const scoreMs = MessageFactory.BuildScoreLookup(
        baseUser,
        mockRobot,
        mockProcVars,
      );
      expect(scoreMs).toMatch(new RegExp(
        `^<@${baseUser.name}> has ${baseUser.score} points.` +
          `\nAccount Level: ${baseUser.accountLevel}` +
          `\nTotal Points Given: ${baseUser.totalPointsGiven}` +
          '\n\n:star: Here are some reasons :star:' +
          '(\n.*:.*){3}$',
      ));
    });

    it('should respond with 3 reasons if the user has 3 and token count', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockMinimalUserLevel2.json');
      const scoreMs = MessageFactory.BuildScoreLookup(
        baseUser,
        mockRobot,
        mockProcVars,
      );
      expect(scoreMs).toMatch(
        /<@peter\.parker\.min> has 8 points \(\*8 Robit Tokens\*\)\.\nAccount Level: 2\nTotal Points Given: -2\n\n:star: Here are some reasons :star:(\n.*:.*){3}/
      );
    });
  });

  describe('GetA1DayMessage', () => {
    const BASE_MSG = 'Hello World I Am Turtle';
    const ROBOT_NAME = 'Robit';
    it('returns a string', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME);
      expect(typeof typeof message).toBe('string');
    });

    it('returns a modified message', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, -1);
      expect(message).toBe(BASE_MSG);
    });

    it('returns a message with vowels removed', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 0);
      const expectedMessage = 'Hll Wrld m Trtl';
      expect(message).toBe(expectedMessage);
    });

    it('returns a message with letters rotated 13 positions', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 1);
      const expectedMessage = 'Uryyb Jbeyq V Nz Ghegyr';
      expect(message).toBe(expectedMessage);
    });

    it('returns static string about itself', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 2);
      expect(message).toBe(`I'm ${ROBOT_NAME}. Not a mind reader!`);
    });

    it('returns static string about classified info', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 3);
      expect(message).toBe("That's classified information, I'm afraid I cannot disclose that.");
    });

    it('returns a message with random casing', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 4);
      expect(message).not.toBe(BASE_MSG);
      expect(message.toLowerCase()).toBe(BASE_MSG.toLowerCase());
    });

    it('returns a message with a random non sequitur added', () => {
      const message = MessageFactory.GetA1DayMessage(
        BASE_MSG,
        ROBOT_NAME,
        5,
        true,
      );
      const expectedNonSequitur = nonSequiturs.some((nonSequitur) =>
        message.includes(nonSequitur),
      );
      expect(expectedNonSequitur).toBe(true);
    });

    it('returns a message that is misspelled in some way', () => {
      const message = MessageFactory.GetA1DayMessage(
        BASE_MSG,
        ROBOT_NAME,
        6,
        true,
      );
      expect(message).not.toBe(BASE_MSG);
    });

    it('returns a flipped and reversed message', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 7);
      expect(message).toBe('ǝlʇɹn┴ ɯ∀ I plɹoM ollǝH');
    });

    it('should return the original message when the index is outside the array', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 8);
      expect(message).toBe(BASE_MSG);
    });
  });
});
