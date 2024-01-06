/* eslint-disable new-cap */
/* eslint-disable mocha/no-setup-in-describe */
const { H } = require('./helpers');

describe('Helpers', () => {
  describe('cleanName', () => {
    it('should clean "@matt" of the @ sign and be "matt" if @ is the first char', () => {
      const fullName = '@matt';
      const cleaned = 'matt';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });

    it('should clean "hello @derp" of the @ sign and be "hello @derp" if @ is not the first char', () => {
      const fullName = 'hello @derp';
      const cleaned = 'hello @derp';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });

    it('should clean "what" of the @ sign and be "what" if @ is not present', () => {
      const fullName = 'what';
      const cleaned = 'what';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });

    it('should clean an empty string "" and return an empty string', () => {
      const fullName = '';
      const cleaned = '';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });

    it('should clean "name.hyphe-nated" of the @ sign and be "name.hyphe-nated" if @ is not present', () => {
      const fullName = 'name.hyphe-nated';
      const cleaned = 'name.hyphe-nated';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });

    it('should clean "dot.name" of the @ sign and be "dot.name" if @ is not present', () => {
      const fullName = 'dot.name';
      const cleaned = 'dot.name';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });
  });

  describe('cleanAndEncodeReason', () => {
    it('should clean "@matt" of the @ sign and be "matt" if @ is the first char', () => {
      const fullName = '@matt';
      const cleaned = 'matt';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });

    it('should clean "hello @derp" of the @ sign and be "hello @derp" if @ is not the first char', () => {
      const fullName = 'hello @derp';
      const cleaned = 'hello @derp';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });

    it('should clean "what" of the @ sign and be "what" if @ is not present', () => {
      const fullName = 'what';
      const cleaned = 'what';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });

    it('should clean an empty string "" and return an empty string', () => {
      const fullName = '';
      const cleaned = '';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });

    it('should clean "name.hyphe-nated" of the @ sign and be "name.hyphe-nated" if @ is not present', () => {
      const fullName = 'name.hyphe-nated';
      const cleaned = 'name.hyphe-nated';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });

    it('should clean "dot.name" of the @ sign and be "dot.name" if @ is not present', () => {
      const fullName = 'dot.name';
      const cleaned = 'dot.name';

      expect(H.cleanName(fullName)).toBe(cleaned);
    });
  });

  describe('decodeReason', () => {
    it('should decode the reason from base64 encoded "you are the best!" to "you are the best!"', () => {
      const encoded = Buffer.from('you are the best!').toString('base64');
      const cleaned = 'you are the best!';

      expect(H.decode(encoded)).toBe(cleaned);
    });

    it('should decode the reason from base64 encoded "this.should.work" to "this.should.work"', () => {
      const encoded = Buffer.from('this.should.work').toString('base64');
      const cleaned = 'this.should.work';

      expect(H.decode(encoded)).toBe(cleaned);
    });

    it('should decode the reason from base64 encoded "why are you    so good?!" to "why are you    so good?!"', () => {
      const encoded = Buffer.from('why are you    so good?!').toString(
        'base64',
      );
      const cleaned = 'why are you    so good?!';

      expect(H.decode(encoded)).toBe(cleaned);
    });

    it('should decode the reason from base64 encoded "hello" to "hello"', () => {
      const encoded = Buffer.from('hello').toString('base64');
      const cleaned = 'hello';

      expect(H.decode(encoded)).toBe(cleaned);
    });

    it('should decode the reason from base64 encoded "“hello“" to "“hello“"', () => {
      const encoded = Buffer.from('“hello“').toString('base64');
      const cleaned = '“hello“';

      expect(H.decode(encoded)).toBe(cleaned);
    });

    it('should decode undefined input to undefined output', () => {
      const encoded = undefined;
      const cleaned = undefined;

      expect(H.decode(encoded)).toBe(cleaned);
    });

    it('should decode undefined input to undefined output', () => {
      const encoded = undefined;
      const cleaned = undefined;

      expect(H.decode(encoded)).toBe(cleaned);
    });
  });

  describe('parseDateStrAndFormat', () => {
    it('should parse "2018-01-01" to a date object', () => {
      const dateStr = '2018-01-01';
      const result = H.parseDateStrAndFormat(dateStr);

      expect(typeof result).toEqual('string');
      expect(result).toEqual('Jan. 1st 2018');
    });

    it('should parse "2018-01-01T00:00:00.000Z" to a date object', () => {
      const dateStr = '2018-01-01T12:00:00.000Z';
      const result = H.parseDateStrAndFormat(dateStr);

      expect(typeof result).toEqual('string');
      expect(result).toEqual('Jan. 1st 2018');
    });

    it('should parse "2020-01-01T00:00:00.000" to a date object', () => {
      const dateStr = '2020-01-01T00:00:00.000';
      const result = H.parseDateStrAndFormat(dateStr);

      expect(typeof result).toEqual('string');
      expect(result).toEqual('Jan. 1st 2020');
    });

    it('should parse "2018-01-01T00:00:00" to a date object', () => {
      const dateStr = '2018-01-01T00:00:00';
      const result = H.parseDateStrAndFormat(dateStr);

      expect(typeof result).toEqual('string');
      expect(result).toEqual('Jan. 1st 2018');
    });

    it('should parse "2020-08-18T19:10:23.500+00:00" to a date object', () => {
      const dateStr = '2020-08-18T19:10:23.500+00:00';
      const result = H.parseDateStrAndFormat(dateStr);

      expect(typeof result).toEqual('string');
      expect(result).toEqual('Aug. 18th 2020');
    });

    it('should parse "2020-08-13T20" to a date object', () => {
      const dateStr = '2020-08-13T20';
      const result = H.parseDateStrAndFormat(dateStr);

      expect(typeof result).toEqual('string');
      expect(result).toEqual('Aug. 13th 2020');
    });

    it('should parse "2018-01-01T" to a date object', () => {
      const dateStr = '2018-01-01T';
      const result = H.parseDateStrAndFormat(dateStr);

      expect(typeof result).toEqual('string');
      expect(result).toEqual('Jan. 1st 2018');
    });

    it('should parse "2020-07-23T12:13:48.593Z" to a date object', () => {
      const dateStr = '2020-07-23T12:13:48.593Z';
      const result = H.parseDateStrAndFormat(dateStr);

      expect(typeof result).toEqual('string');
      expect(result).toEqual('Jul. 23rd 2020');
    });

    it('should parse "2020-11-19T20:57:36.526+00:00" to a date object', () => {
      const dateStr = '2020-11-19T20:57:36.526+00:00';
      const result = H.parseDateStrAndFormat(dateStr);

      expect(typeof result).toEqual('string');
      expect(result).toEqual('Nov. 19th 2020');
    });

    it(`should parse dennis's hubotDay "2020-11-19T20:57:36.526+00:00" to a date object`, () => {
      const dateStr = '2020-11-19T20:57:36.526+00:00';
      const result = H.parseDateStrAndFormat(dateStr);

      expect(typeof result).toEqual('string');
      expect(result).toEqual('Nov. 19th 2020');
    });
  });
});
