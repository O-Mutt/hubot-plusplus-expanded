const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const forEach = require('mocha-each');
const moment = require('moment');

const Helpers = require('./Helpers');
const MessageFactory = require('./MessageFactory');
const { nonSequiturs } = require('./static/a1');

const { expect } = chai;

describe('MessageFactory', function () {
  // This method expects base64 encoded reasons but we are stubbing out the decode method
  describe('BuildNewScoreMessage', function () {
    before(function () {
      const mockHelpers = sinon.stub(Helpers, 'decode');
      mockHelpers.returnsArg(0);
    });
    const notBotDay = moment().subtract(1, 'year').add(5, 'days');
    const botDay = moment().subtract(1, 'year');
    forEach([
      [undefined, undefined, ''],
      [
        {
          name: 'matt', score: 1, reasons: {}, hubotDay: notBotDay,
        }, undefined, 'matt has 1 point.',
      ],
      [
        {
          name: 'matt', score: 2, reasons: {}, hubotDay: notBotDay,
        }, undefined, 'matt has 2 points.',
      ],
      [
        {
          name: 'matt', score: 100, reasons: {}, hubotDay: notBotDay,
        }, undefined, ':100: matt has 100 points :100:',
      ],
      [
        {
          name: 'matt', score: 1000, reasons: {}, hubotDay: notBotDay,
        }, undefined, ':1000: matt has 1000 points :1000:',
      ],
      [
        {
          name: 'matt', score: 300, reasons: {}, hubotDay: notBotDay,
        }, undefined, ':300: matt has 300 points :300:',
      ],
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
    ])
      .it('should take the user object %j, reason %j and print %j',
        (user, reason, expectedMessage) => {
          const message = MessageFactory.BuildNewScoreMessage(user, Helpers.cleanAndEncode(reason), { name: 'hubot' });
          expect(message).to.equal(expectedMessage);
        });
  });

  describe('GetA1DayMessage', function () {
    const BASE_MSG = 'Hello World I Am Turtle';
    const ROBOT_NAME = 'Robit';
    it('returns a string', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME);
      expect(typeof message).to.be.a('string');
    });

    it('returns a modified message', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, -1);
      expect(message).to.equal(BASE_MSG);
    });

    it('returns a message with vowels removed', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 0);
      const expectedMessage = 'Hll Wrld m Trtl';
      expect(message).to.equal(expectedMessage);
    });

    it('returns a message with letters rotated 13 positions', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 1);
      const expectedMessage = 'Uryyb Jbeyq V Nz Ghegyr';
      expect(message).to.equal(expectedMessage);
    });

    it('returns static string about itself', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 2);
      expect(message).to.equal(`I'm ${ROBOT_NAME}. Not a mind reader!`);
    });

    it('returns static string about classified info', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 3);
      expect(message).to.equal("That's classified information, I'm afraid I cannot disclose that.");
    });

    it('returns a message with random casing', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 4);
      expect(message).not.to.equal(BASE_MSG);
      expect(message.toLowerCase()).to.equal(BASE_MSG.toLowerCase());
    });

    it('returns a message with a random non sequitur added', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 5, true);
      const expectedNonSequitur = nonSequiturs.some((nonSequitur) => message.includes(nonSequitur));
      expect(expectedNonSequitur).to.equal(true);
    });

    it('returns a message that is misspelled in some way', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 6, true);
      expect(message).not.to.equal(BASE_MSG);
    });

    it('returns a flipped and reversed message', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 7);
      expect(message).to.equal('ǝlʇɹn┴ ɯ∀ I plɹoM ollǝH');
    });

    it('should return the original message when the index is outside the array', function () {
      const message = MessageFactory.GetA1DayMessage(BASE_MSG, ROBOT_NAME, 8);
      expect(message).to.equal(BASE_MSG);
    });
  });
});
