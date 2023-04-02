/* eslint-disable new-cap */
/* eslint-disable mocha/no-setup-in-describe */
const chai = require('chai');
chai.use(require('sinon-chai'));
const forEach = require('mocha-each');

const { expect } = chai;

const Helpers = require('./Helpers');

describe('Helpers', () => {
  describe('cleanName', () => {
    forEach([
      ['@matt', 'matt'],
      ['hello @derp', 'hello @derp'],
      ['what', 'what'],
      ['', ''],
      ['name.hyphe-nated', 'name.hyphe-nated'],
      ['dot.name', 'dot.name'],
    ]).it('should clean %j of the @ sign and be %j if @ is the first char', (fullName, cleaned) => {
      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });
  });

  describe('cleanAndEncodeReason', () => {
    forEach([
      ['You are the best!', new Buffer.from('you are the best!').toString('base64')],
      ['this.should.work', new Buffer.from('this.should.work').toString('base64')],
      ['      why are you    so good?!', new Buffer.from('why are you    so good?!').toString('base64')],
      ['HELLO', new Buffer.from('hello').toString('base64')],
      ['“HELLO“', new Buffer.from('“hello“').toString('base64')],
      ['', undefined],
      [undefined, undefined],
    ]).it('should clean the reason %j and base 64 encode it to %j', (reason, encoded) => {
      expect(Helpers.cleanAndEncode(reason)).to.equal(encoded);
    });
  });

  describe('decodeReason', () => {
    forEach([
      [new Buffer.from('you are the best!').toString('base64'), 'you are the best!'],
      [new Buffer.from('this.should.work').toString('base64'), 'this.should.work'],
      [new Buffer.from('why are you    so good?!').toString('base64'), 'why are you    so good?!'],
      [new Buffer.from('hello').toString('base64'), 'hello'],
      [new Buffer.from('“hello“').toString('base64'), '“hello“'],
      [undefined, undefined],
      [undefined, undefined, undefined],
    ]).it('should decode the reason %j from base 64 encode to %j', (encoded, cleaned) => {
      expect(Helpers.decode(encoded)).to.equal(cleaned);
    });
  });
});
