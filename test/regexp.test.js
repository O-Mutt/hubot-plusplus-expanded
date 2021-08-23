/* eslint-disable new-cap */
/* eslint-disable mocha/no-setup-in-describe */
const chai = require('chai');
chai.use(require('sinon-chai'));

const { expect } = chai;

const regexp = require('../src/regexp');

describe('regexp', function () {
  describe('createGiveTokenRegExp', function () {
    it('should match a name + number', function () {
      const giveTokenMatcher = regexp.createGiveTokenRegExp();
      expect('@matt + 5'.match(giveTokenMatcher)).to.be.an('array').that.include('@matt', '+', '5');
    });
  });
});
