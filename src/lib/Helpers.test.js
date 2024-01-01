/* eslint-disable new-cap */
/* eslint-disable mocha/no-setup-in-describe */
const chai = require('chai');

const { expect } = chai;

const Helpers = require('./Helpers');

describe('Helpers', () => {
  describe('cleanName', () => {
    it('should clean "@matt" of the @ sign and be "matt" if @ is the first char', () => {
      const fullName = '@matt';
      const cleaned = 'matt';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });

    it('should clean "hello @derp" of the @ sign and be "hello @derp" if @ is not the first char', () => {
      const fullName = 'hello @derp';
      const cleaned = 'hello @derp';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });

    it('should clean "what" of the @ sign and be "what" if @ is not present', () => {
      const fullName = 'what';
      const cleaned = 'what';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });

    it('should clean an empty string "" and return an empty string', () => {
      const fullName = '';
      const cleaned = '';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });

    it('should clean "name.hyphe-nated" of the @ sign and be "name.hyphe-nated" if @ is not present', () => {
      const fullName = 'name.hyphe-nated';
      const cleaned = 'name.hyphe-nated';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });

    it('should clean "dot.name" of the @ sign and be "dot.name" if @ is not present', () => {
      const fullName = 'dot.name';
      const cleaned = 'dot.name';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });
  });

  describe('cleanAndEncodeReason', () => {
    it('should clean "@matt" of the @ sign and be "matt" if @ is the first char', () => {
      const fullName = '@matt';
      const cleaned = 'matt';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });

    it('should clean "hello @derp" of the @ sign and be "hello @derp" if @ is not the first char', () => {
      const fullName = 'hello @derp';
      const cleaned = 'hello @derp';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });

    it('should clean "what" of the @ sign and be "what" if @ is not present', () => {
      const fullName = 'what';
      const cleaned = 'what';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });

    it('should clean an empty string "" and return an empty string', () => {
      const fullName = '';
      const cleaned = '';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });

    it('should clean "name.hyphe-nated" of the @ sign and be "name.hyphe-nated" if @ is not present', () => {
      const fullName = 'name.hyphe-nated';
      const cleaned = 'name.hyphe-nated';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });

    it('should clean "dot.name" of the @ sign and be "dot.name" if @ is not present', () => {
      const fullName = 'dot.name';
      const cleaned = 'dot.name';

      expect(Helpers.cleanName(fullName)).to.equal(cleaned);
    });
  });

  describe('decodeReason', () => {
    it('should decode the reason from base64 encoded "you are the best!" to "you are the best!"', () => {
      const encoded = Buffer.from('you are the best!').toString('base64');
      const cleaned = 'you are the best!';

      expect(Helpers.decode(encoded)).to.equal(cleaned);
    });

    it('should decode the reason from base64 encoded "this.should.work" to "this.should.work"', () => {
      const encoded = Buffer.from('this.should.work').toString('base64');
      const cleaned = 'this.should.work';

      expect(Helpers.decode(encoded)).to.equal(cleaned);
    });

    it('should decode the reason from base64 encoded "why are you    so good?!" to "why are you    so good?!"', () => {
      const encoded = Buffer.from('why are you    so good?!').toString(
        'base64',
      );
      const cleaned = 'why are you    so good?!';

      expect(Helpers.decode(encoded)).to.equal(cleaned);
    });

    it('should decode the reason from base64 encoded "hello" to "hello"', () => {
      const encoded = Buffer.from('hello').toString('base64');
      const cleaned = 'hello';

      expect(Helpers.decode(encoded)).to.equal(cleaned);
    });

    it('should decode the reason from base64 encoded "“hello“" to "“hello“"', () => {
      const encoded = Buffer.from('“hello“').toString('base64');
      const cleaned = '“hello“';

      expect(Helpers.decode(encoded)).to.equal(cleaned);
    });

    it('should decode undefined input to undefined output', () => {
      const encoded = undefined;
      const cleaned = undefined;

      expect(Helpers.decode(encoded)).to.equal(cleaned);
    });

    it('should decode undefined input to undefined output', () => {
      const encoded = undefined;
      const cleaned = undefined;

      expect(Helpers.decode(encoded)).to.equal(cleaned);
    });
  });
});
