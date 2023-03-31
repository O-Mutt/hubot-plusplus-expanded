const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const forEach = require('mocha-each');
const { subYears, addDays } = require('date-fns');
const { wait } = require('../../test/test_helpers');

const Helpers = require('./Helpers');
const MessageFactory = require('./MessageFactory');
const { nonSequiturs } = require('./static/a1');

const { expect } = chai;

describe('MessageFactory', () => {
  const testCases = [];
  const mockRobot = { name: 'Robit' };
  const mockProcVars = { reasonsKeyword: 'reasons' };
  let notBotDay;
  let botDay;
  before(() => {
    const mockHelpers = sinon.stub(Helpers, 'decode');
    mockHelpers.returnsArg(0);
    notBotDay = addDays(subYears(new Date(), 1), 5);
    botDay = subYears(new Date(), 1);

    testCases.push([
      [
        {
          name: 'matt', score: 45, reasons: { [Helpers.cleanAndEncode('winning')]: 1 }, hubotDay: notBotDay,
        }, 'winning', 'matt has 45 points, 1 of which is for winning.',
      ],
      [
        {
          name: 'matt', score: 1, reasons: { [Helpers.cleanAndEncode('cool runnings!')]: 1 }, hubotDay: notBotDay,
        }, 'cool runnings!', 'matt has 1 point for cool runnings!.',
      ],
      [
        {
          name: 'matt', score: 1, reasons: { [Helpers.cleanAndEncode('cool runnings!')]: 1 }, hubotDay: botDay,
        }, 'cool runnings!', 'matt has 1 point for cool runnings!.\n:birthday: Today is matt\'s 1st hubotday! :birthday:',
      ],
      [
        {
          name: 'matt', score: 99, reasons: { [Helpers.cleanAndEncode('cool runnings!')]: 0 }, hubotDay: notBotDay,
        }, 'cool runnings!', 'matt has 99 points, none of which are for cool runnings!.',
      ],
      [
        {
          name: 'matt', score: 1, reasons: { [Helpers.cleanAndEncode('cool runnings!')]: 99 }, hubotDay: notBotDay,
        }, 'cool runnings!', 'matt has 1 point, 99 of which are for cool runnings!.',
      ],
      [
        {
          name: 'matt', score: 145, reasons: { [Helpers.cleanAndEncode('cool runnings!')]: 99 }, hubotDay: notBotDay,
        }, 'cool runnings!', 'matt has 145 points, 99 of which are for cool runnings!.',
      ],
      [
        {
          name: 'matt', score: 200, reasons: { [Helpers.cleanAndEncode('cool runnings!')]: 99 }, hubotDay: notBotDay,
        }, 'cool runnings!', ':200: matt has 200 points :200:, 99 of which are for cool runnings!.',
      ],
      [
        {
          name: 'matt', score: 0, reasons: { }, hubotDay: notBotDay,
        }, undefined, ':zero: matt has 0 points :zero:',
      ],
    ]);
  });

  // This method expects base64 encoded reasons but we are stubbing out the decode method
  describe('BuildNewScoreMessage', () => {
    it('should handle undefined user, undefined reason, and print \'\'', () => {
      const user = undefined;
      const emptyReasons = Helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(user, emptyReasons, mockRobot);
      expect(msg).to.equal('');
    });

    it('should take the user w/a single point without reasons and print their score', () => {
      const user = {
        name: 'matt', score: 1, reasons: {}, hubotDay: notBotDay,
      };
      const emptyReasons = Helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(user, emptyReasons, mockRobot);
      expect(msg).to.equal('matt has 1 point.');
    });

    it('should take the user w/2 points (plural) without reasons and print their score', () => {
      const user = {
        name: 'matt', score: 2, reasons: {}, hubotDay: notBotDay,
      };
      const emptyReasons = Helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(user, emptyReasons, mockRobot);
      expect(msg).to.equal('matt has 2 points.');
    });

    it('should take the user w/100 points (special case) and print their score as the special output', () => {
      const user = {
        name: 'matt', score: 100, reasons: {}, hubotDay: notBotDay,
      };
      const emptyReasons = Helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(user, emptyReasons, mockRobot);
      expect(msg).to.equal(':100: matt has 100 points :100:');
    });

    it('should take the user w/1000 points (special case) and print their score as the special output', () => {
      const user = {
        name: 'matt', score: 1000, reasons: {}, hubotDay: notBotDay,
      };
      const emptyReasons = Helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(user, emptyReasons, mockRobot);
      expect(msg).to.equal(':1000: matt has 1000 points :1000:');
    });

    it('should take the user w/300 points (special case) and print their score as the special output', () => {
      const user = {
        name: 'matt', score: 300, reasons: {}, hubotDay: notBotDay,
      };
      const emptyReasons = Helpers.cleanAndEncode(undefined);
      const msg = MessageFactory.BuildNewScoreMessage(user, emptyReasons, mockRobot);
      expect(msg).to.equal(':300: matt has 300 points :300:');
    });

    forEach(testCases).it('should take the user object %j, reason %j and print %j', (user, reason, expectedMessage) => {
      const message = MessageFactory.BuildNewScoreMessage(user, Helpers.cleanAndEncode(reason), { name: 'hubot' });
      expect(message).to.equal(expectedMessage);
    });
  });

  describe('BuildScoreLookup', () => {
    it('should respond with empty if any vars are undefined or empty', () => {
      let dummyMsg = MessageFactory.BuildScoreLookup(undefined, undefined, undefined);
      expect(dummyMsg).to.equal('');

      dummyMsg = MessageFactory.BuildScoreLookup({}, undefined, undefined);
      expect(dummyMsg).to.equal('');

      dummyMsg = MessageFactory.BuildScoreLookup(undefined, {}, undefined);
      expect(dummyMsg).to.equal('');

      dummyMsg = MessageFactory.BuildScoreLookup(undefined, undefined, {});
      expect(dummyMsg).to.equal('');

      dummyMsg = MessageFactory.BuildScoreLookup({}, undefined, {});
      expect(dummyMsg).to.equal('');

      dummyMsg = MessageFactory.BuildScoreLookup({}, {}, undefined);
      expect(dummyMsg).to.equal('');

      dummyMsg = MessageFactory.BuildScoreLookup(undefined, {}, {});
      expect(dummyMsg).to.equal('');

      dummyMsg = MessageFactory.BuildScoreLookup({}, {}, {});
      expect(dummyMsg).to.equal('');
    });

    it('should respond with 5 reasons if the user has 5 or more', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockFullUser.json');
      const scoreMs = MessageFactory.BuildScoreLookup(baseUser, mockRobot.name, mockProcVars);
      expect(scoreMs).to.have.match(new RegExp(
        `^<@${baseUser.name}> has ${baseUser.score} points.`
        + `\nAccount Level: ${baseUser.accountLevel}`
        + `\nTotal Points Given: ${baseUser.totalPointsGiven}`
        + '\n\n:star: Here are some reasons :star:'
        + '(\n.*:.*){5}$',
      ));
    });

    it('should respond with score and no reasons if the user has no reasons', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockMultiUser1.json');
      const scoreMs = MessageFactory.BuildScoreLookup(baseUser, mockRobot.name, mockProcVars);
      expect(scoreMs).to.equal(
        `<@${baseUser.name}> has ${baseUser.score} points.`
        + `\nAccount Level: ${baseUser.accountLevel}`
        + `\nTotal Points Given: ${baseUser.totalPointsGiven}`,
      );
    });

    it('should respond with 3 reasons if the user has 3', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockMinimalUser.json');
      const scoreMs = MessageFactory.BuildScoreLookup(baseUser, mockRobot.name, mockProcVars);
      expect(scoreMs).to.have.match(new RegExp(
        `^<@${baseUser.name}> has ${baseUser.score} points.`
        + `\nAccount Level: ${baseUser.accountLevel}`
        + `\nTotal Points Given: ${baseUser.totalPointsGiven}`
        + '\n\n:star: Here are some reasons :star:'
        + '(\n.*:.*){3}$',
      ));
    });

    it('should respond with 3 reasons if the user has 3 and token count', async () => {
      // eslint-disable-next-line global-require
      const baseUser = require('../../test/mockData/mockMinimalUserLevel2.json');
      const scoreMs = MessageFactory.BuildScoreLookup(baseUser, mockRobot.name, mockProcVars);
      expect(scoreMs).to.have.match(/<@peter\.parker\.min> has 8 points \(\*8 Robit Tokens\*\)\.\nAccount Level: 2\nTotal Points Given: -2\n\n:star: Here are some reasons :star:(\n.*:.*){3}/);
    });
  });

  describe('GetA1DayMessage', () => {
    const BASE_MSG = 'Hello World I Am Turtle';
    const ROBOT_NAME = 'Robit';
    it('returns a string', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME);
      expect(typeof message).to.be.a('string');
    });

    it('returns a modified message', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, -1);
      expect(message).to.equal(BASE_MSG);
    });

    it('returns a message with vowels removed', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 0);
      const expectedMessage = 'Hll Wrld m Trtl';
      expect(message).to.equal(expectedMessage);
    });

    it('returns a message with letters rotated 13 positions', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 1);
      const expectedMessage = 'Uryyb Jbeyq V Nz Ghegyr';
      expect(message).to.equal(expectedMessage);
    });

    it('returns static string about itself', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 2);
      expect(message).to.equal(`I'm ${ROBOT_NAME}. Not a mind reader!`);
    });

    it('returns static string about classified info', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 3);
      expect(message).to.equal("That's classified information, I'm afraid I cannot disclose that.");
    });

    it('returns a message with random casing', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 4);
      expect(message).not.to.equal(BASE_MSG);
      expect(message.toLowerCase()).to.equal(BASE_MSG.toLowerCase());
    });

    it('returns a message with a random non sequitur added', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 5, true);
      const expectedNonSequitur = nonSequiturs.some((nonSequitur) => message.includes(nonSequitur));
      expect(expectedNonSequitur).to.equal(true);
    });

    it('returns a message that is misspelled in some way', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 6, true);
      expect(message).not.to.equal(BASE_MSG);
    });

    it('returns a flipped and reversed message', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 7);
      expect(message).to.equal('ǝlʇɹn┴ ɯ∀ I plɹoM ollǝH');
    });

    it('should return the original message when the index is outside the array', () => {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 8);
      expect(message).to.equal(BASE_MSG);
    });
  });
});
