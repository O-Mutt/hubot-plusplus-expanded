/* eslint-disable new-cap */
/* eslint-disable mocha/no-setup-in-describe */
const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const forEach = require('mocha-each');
const moment = require('moment');

const { expect } = chai;

const helpers = require('../src/helpers');

describe('Helpers', function () {
  describe('cleanName', function () {
    forEach([
      ['@matt', 'matt'],
      ['hello @derp', 'hello @derp'],
      ['what', 'what'],
      ['', ''],
      ['name.hyphe-nated', 'name.hyphe-nated'],
      ['dot.name', 'dot.name'],
    ]).it('should clean %j of the @ sign and be %j if @ is the first char', (fullName, cleaned) => {
      expect(helpers.cleanName(fullName)).to.equal(cleaned);
    });
  });

  describe('cleanAndEncodeReason', function () {
    forEach([
      ['You are the best!', new Buffer.from('you are the best!').toString('base64')],
      ['this.should.work', new Buffer.from('this.should.work').toString('base64')],
      ['      why are you    so good?!', new Buffer.from('why are you    so good?!').toString('base64')],
      ['HELLO', new Buffer.from('hello').toString('base64')],
      ['“HELLO“', new Buffer.from('“hello“').toString('base64')],
      ['', undefined],
      [undefined, undefined],
    ]).it('should clean the reason %j and base 64 encode it to %j', (reason, encoded) => {
      expect(helpers.cleanAndEncode(reason)).to.equal(encoded);
    });
  });

  describe('decodeReason', function () {
    forEach([
      [new Buffer.from('you are the best!').toString('base64'), 'you are the best!'],
      [new Buffer.from('this.should.work').toString('base64'), 'this.should.work'],
      [new Buffer.from('why are you    so good?!').toString('base64'), 'why are you    so good?!'],
      [new Buffer.from('hello').toString('base64'), 'hello'],
      [new Buffer.from('“hello“').toString('base64'), '“hello“'],
      [undefined, undefined],
      [undefined, undefined, undefined],
    ]).it('should decode the reason %j from base 64 encode to %j', (encoded, cleaned) => {
      expect(helpers.decode(encoded)).to.equal(cleaned);
    });
  });

  // This method expects base64 encoded reasons but we are stubbing out the decode method
  describe('getMessageForNewScore', function () {
    before(function () {
      const mockHelpers = sinon.stub(helpers, 'decode');
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
          name: 'matt', score: 45, reasons: { [helpers.cleanAndEncode('winning')]: 1 }, hubotDay: notBotDay,
        }, 'winning', 'matt has 45 points, 1 of which is for winning.',
      ],
      [
        {
          name: 'matt', score: 1, reasons: { [helpers.cleanAndEncode('cool runnings!')]: 1 }, hubotDay: notBotDay,
        }, 'cool runnings!', 'matt has 1 point for cool runnings!.',
      ],
      [
        {
          name: 'matt', score: 1, reasons: { [helpers.cleanAndEncode('cool runnings!')]: 1 }, hubotDay: botDay,
        }, 'cool runnings!', 'matt has 1 point for cool runnings!.\n:birthday: Today is matt\'s 1st hubotday! :birthday:',
      ],
      [
        {
          name: 'matt', score: 99, reasons: { [helpers.cleanAndEncode('cool runnings!')]: 0 }, hubotDay: notBotDay,
        }, 'cool runnings!', 'matt has 99 points, none of which are for cool runnings!.',
      ],
      [
        {
          name: 'matt', score: 1, reasons: { [helpers.cleanAndEncode('cool runnings!')]: 99 }, hubotDay: notBotDay,
        }, 'cool runnings!', 'matt has 1 point, 99 of which are for cool runnings!.',
      ],
      [
        {
          name: 'matt', score: 145, reasons: { [helpers.cleanAndEncode('cool runnings!')]: 99 }, hubotDay: notBotDay,
        }, 'cool runnings!', 'matt has 145 points, 99 of which are for cool runnings!.',
      ],
      [
        {
          name: 'matt', score: 200, reasons: { [helpers.cleanAndEncode('cool runnings!')]: 99 }, hubotDay: notBotDay,
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
          const message = helpers.getMessageForNewScore(user, helpers.cleanAndEncode(reason), { name: 'hubot' });
          expect(message).to.equal(expectedMessage);
        });
  });
});
