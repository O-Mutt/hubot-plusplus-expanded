const { subYears, addDays, format, parseISO } = require('date-fns');

const { H } = require('./helpers');
const { mfs } = require('./messageFactory');
const { nonSequiturs } = require('./static/a1');

describe('MessageFactory', () => {
  const mockProcVars = { reasonsKeyword: 'reasons' };
  let notBotDay;
  let botDay;
  let capRobotName;
  beforeEach(() => {
    notBotDay = addDays(subYears(new Date(), 1), 5);
    botDay = subYears(new Date(), 1);
    capRobotName = H.capitalizeFirstLetter(mockRobot.name);
  });

  // This method expects base64 encoded reasons but we are stubbing out the decode method
  describe('BuildNewScoreMessage', () => {
    it("should handle undefined user, undefined reason, and print ''", () => {
      const user = undefined;
      const emptyReasons = H.cleanAndEncode(undefined);
      const msg = mfs.BuildNewScoreMessage(
        mockRobot,
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
      const emptyReasons = H.cleanAndEncode(undefined);
      const msg = mfs.BuildNewScoreMessage(
        mockRobot,
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
      const emptyReasons = H.cleanAndEncode(undefined);
      const msg = mfs.BuildNewScoreMessage(
        mockRobot,
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
      const emptyReasons = H.cleanAndEncode(undefined);
      const msg = mfs.BuildNewScoreMessage(
        mockRobot,
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
      const emptyReasons = H.cleanAndEncode(undefined);
      const msg = mfs.BuildNewScoreMessage(
        mockRobot,
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
      const emptyReasons = H.cleanAndEncode(undefined);
      const msg = mfs.BuildNewScoreMessage(
        mockRobot,
        user,
        emptyReasons,
        mockRobot,
      );
      expect(msg).toBe(':300: matt has 300 points :300:');
    });

    it('should take the user object and reason "winning" and print the expected message', () => {
      const reason = H.cleanAndEncode('winning');
      const decoded = 'winning';
      const user = {
        name: 'matt',
        score: 45,
        reasons: { [reason]: 1 },
        hubotDay: notBotDay,
      };
      const expectedMessage = `matt has 45 points, 1 of which is for ${decoded}.`;

      const message = mfs.BuildNewScoreMessage(
        mockRobot,
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message', () => {
      const reason = H.cleanAndEncode('cool runnings!');
      const decoded = 'cool runnings!';
      const user = {
        name: 'matt',
        score: 1,
        reasons: { [reason]: 1 },
        hubotDay: notBotDay,
      };
      const expectedMessage = 'matt has 1 point for cool runnings!';

      const message = mfs.BuildNewScoreMessage(
        mockRobot,
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message for botDay', () => {
      const reason = H.cleanAndEncode('cool runnings!');
      const decoded = 'cool runnings!';
      const user = {
        name: 'matt',
        score: 1,
        reasons: { [reason]: 1 },
        hubotDay: botDay,
      };

      const expectedMessage = `matt has 1 point for ${decoded}\n:birthday: Today is matt's 1st ${mockRobot.name}day! :birthday:`;

      const message = mfs.BuildNewScoreMessage(
        mockRobot,
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message when no points for the reason', () => {
      const reason = H.cleanAndEncode('cool runnings!');
      const decoded = 'cool runnings!';
      const user = {
        name: 'matt',
        score: 99,
        reasons: { [reason]: 0 },
        hubotDay: notBotDay,
      };

      const expectedMessage = `matt has 99 points, none of which are for ${decoded}`;

      const message = mfs.BuildNewScoreMessage(
        mockRobot,
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message when 99 points for the reason', () => {
      const reason = H.cleanAndEncode('cool runnings!');
      const decoded = 'cool runnings!';
      const user = {
        name: 'matt',
        score: 1,
        reasons: { [reason]: 99 },
        hubotDay: notBotDay,
      };

      const expectedMessage = `matt has 1 point, 99 of which are for ${decoded}`;

      const message = mfs.BuildNewScoreMessage(
        mockRobot,
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message when 99 points for the reason and 145 total points', () => {
      const reason = H.cleanAndEncode('cool runnings!');
      const decoded = 'cool runnings!';
      const user = {
        name: 'matt',
        score: 145,
        reasons: { [reason]: 99 },
        hubotDay: notBotDay,
      };

      const expectedMessage = `matt has 145 points, 99 of which are for ${decoded}`;

      const message = mfs.BuildNewScoreMessage(
        mockRobot,
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object and reason "cool runnings!" and print the expected message when 99 points for the reason and 200 total points', () => {
      const reason = H.cleanAndEncode('cool runnings!');
      const decoded = 'cool runnings!';

      const user = {
        name: 'matt',
        score: 200,
        reasons: { [reason]: 99 },
        hubotDay: notBotDay,
      };

      const expectedMessage = `:200: matt has 200 points :200:, 99 of which are for ${decoded}`;

      const message = mfs.BuildNewScoreMessage(
        mockRobot,
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

      const message = mfs.BuildNewScoreMessage(
        mockRobot,
        user,
        reason,
        'hubot',
      );
      expect(message).toBe(expectedMessage);
    });

    it('should take the user object with multiple reasons and print the expected message for each reason', () => {
      const reason1 = H.cleanAndEncode('cool runnings!');
      const reason2 = H.cleanAndEncode('winning');
      const decoded1 = 'cool runnings!';
      const decoded2 = 'winning';
      const user = {
        name: 'matt',
        score: 50,
        reasons: {
          [reason1]: 10,
          [reason2]: 2,
        },
        hubotDay: notBotDay,
      };

      const expectedMessage1 = `matt has 50 points, 10 of which are for ${decoded1}`;
      const expectedMessage2 = `matt has 50 points, 2 of which are for ${decoded2}.`;
      const message1 = mfs.BuildNewScoreMessage(
        mockRobot,
        user,
        reason1,
        'hubot',
      );

      expect(message1).toBe(expectedMessage1);

      const message2 = mfs.BuildNewScoreMessage(
        mockRobot,
        user,
        reason2,
        'hubot',
      );
      expect(message2).toBe(expectedMessage2);
    });
  });

  describe('BuildScoreLookup', () => {
    it('should respond with empty if any vars are undefined or empty', () => {
      let dummyMsg = mfs.BuildScoreLookup(
        mockRobot,
        undefined,
        undefined,
        undefined,
      );
      expect(dummyMsg).toBe('');

      dummyMsg = mfs.BuildScoreLookup(mockRobot, {}, undefined, undefined);
      expect(dummyMsg).toBe('');

      dummyMsg = mfs.BuildScoreLookup(mockRobot, undefined, {}, undefined);
      expect(dummyMsg).toBe('');

      dummyMsg = mfs.BuildScoreLookup(mockRobot, undefined, undefined, {});
      expect(dummyMsg).toBe('');

      dummyMsg = mfs.BuildScoreLookup(mockRobot, {}, undefined, {});
      expect(dummyMsg).toBe('');

      dummyMsg = mfs.BuildScoreLookup(mockRobot, {}, {}, undefined);
      expect(dummyMsg).toBe('');

      dummyMsg = mfs.BuildScoreLookup(mockRobot, undefined, {}, {});
      expect(dummyMsg).toBe('');

      dummyMsg = mfs.BuildScoreLookup(mockRobot, {}, {}, {});
      expect(dummyMsg).toBe('');
    });

    it('should respond with 5 reasons if the user has 5 or more', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockFullUser.json');
      const scoreMs = mfs.BuildScoreLookup(
        mockRobot,
        baseUser,
        mockRobot,
        mockProcVars,
      );
      const splitString = scoreMs.split('\n');
      const botDay = format(
        parseISO(baseUser[`${mockRobot.name}Day`]),
        'MMM. do yyyy',
      );
      expect(splitString).toEqual([
        `<@${baseUser.name}> has ${baseUser.score} points.`,
        `Account Level: ${baseUser.accountLevel}`,
        `Total Points Given: ${baseUser.totalPointsGiven}`,
        `:birthday: ${capRobotName}day is ${botDay}`,
        '',
        ':star: Here are some reasons :star:',
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]);
    });

    it('should respond with score and no reasons if the user has no reasons', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockMultiUser1.json');
      const scoreMs = mfs.BuildScoreLookup(
        mockRobot,
        baseUser,
        mockRobot,
        mockProcVars,
      );
      expect(scoreMs).toBe(
        `<@${baseUser.name}> has ${baseUser.score} points.` +
          `\nAccount Level: ${baseUser.accountLevel}` +
          `\nTotal Points Given: ${baseUser.totalPointsGiven}`,
      );
    });

    it('should respond with 3 reasons if the user has 3', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockMinimalUser.json');
      const scoreMs = mfs.BuildScoreLookup(
        mockRobot,
        baseUser,
        mockRobot,
        mockProcVars,
      );
      const splitLines = scoreMs.split('\n');
      const botDay = format(
        parseISO(baseUser[`${mockRobot.name}Day`]),
        'MMM. do yyyy',
      );
      expect(splitLines).toEqual([
        `<@${baseUser.name}> has ${baseUser.score} points.`,
        `Account Level: ${baseUser.accountLevel}`,
        `Total Points Given: ${baseUser.totalPointsGiven}`,
        `:birthday: ${capRobotName}day is ${botDay}`,
        '',
        ':star: Here are some reasons :star:',
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]);
    });

    it('should respond with 3 reasons if the user has 3 and token count', async () => {
      const baseUser = require('../../test/mockData/mockMinimalUserLevel2.json');
      const scoreMs = mfs.BuildScoreLookup(
        mockRobot,
        baseUser,
        mockRobot,
        mockProcVars,
      );
      const splitLines = scoreMs.split('\n');
      const botDay = format(
        parseISO(baseUser[`${mockRobot.name}Day`]),
        'MMM. do yyyy',
      );
      expect(splitLines).toEqual([
        `<@${baseUser.name}> has ${baseUser.score} points (*8 Hubot Tokens*).`,
        `Account Level: ${baseUser.accountLevel}`,
        `Total Points Given: ${baseUser.totalPointsGiven}`,
        `:birthday: ${capRobotName}day is ${botDay}`,
        '',
        ':star: Here are some reasons :star:',
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]);
    });
  });

  describe('GetA1DayMessage', () => {
    const BASE_MSG = 'Hello World I Am Turtle';
    it('returns a string', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG);
      expect(typeof typeof message).toBe('string');
    });

    it('returns a modified message', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG, -1);
      expect(message).toBe(BASE_MSG);
    });

    it('returns a message with vowels removed', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG, 0);
      const expectedMessage = 'Hll Wrld m Trtl';
      expect(message).toBe(expectedMessage);
    });

    it('returns a message with letters rotated 13 positions', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG, 1);
      const expectedMessage = 'Uryyb Jbeyq V Nz Ghegyr';
      expect(message).toBe(expectedMessage);
    });

    it('returns static string about itself', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG, 2);
      expect(message).toBe(`I'm ${mockRobot.name}. Not a mind reader!`);
    });

    it('returns static string about classified info', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG, 3);
      expect(message).toBe(
        "That's classified information, I'm afraid I cannot disclose that.",
      );
    });

    it('returns a message with random casing', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG, 4);
      expect(message).not.toBe(BASE_MSG);
      expect(message.toLowerCase()).toBe(BASE_MSG.toLowerCase());
    });

    it('returns a message with a random non sequitur added', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG, 5, true);
      const expectedNonSequitur = nonSequiturs.some((nonSequitur) =>
        message.includes(nonSequitur),
      );
      expect(expectedNonSequitur).toBe(true);
    });

    it('returns a message that is misspelled in some way', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG, 6, true);
      expect(message).not.toBe(BASE_MSG);
    });

    it('returns a flipped and reversed message', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG, 7);
      expect(message).toBe('ǝlʇɹn┴ ɯ∀ I plɹoM ollǝH');
    });

    it('should return the original message when the index is outside the array', () => {
      const message = mfs.GetA1DayMessage(mockRobot, BASE_MSG, 8);
      expect(message).toBe(BASE_MSG);
    });
  });
});
