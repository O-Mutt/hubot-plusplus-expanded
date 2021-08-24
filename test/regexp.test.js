/* eslint-disable new-cap */
/* eslint-disable mocha/no-setup-in-describe */
const chai = require('chai');
chai.use(require('sinon-chai'));
const forEach = require('mocha-each');

const { expect } = chai;

const regexp = require('../src/regexp');

describe('regexp', function () {
  describe('createGiveTokenRegExp', function () {
    it('should match a name + number', function () {
      const giveTokenMatcher = regexp.createGiveTokenRegExp();
      const match = '@matt + 5'.match(giveTokenMatcher);
      expect('@matt + 5').to.match(giveTokenMatcher);
      expect(match).to.be.an('array').that.include('matt', '+', '5');
    });
  });

  describe('positiveOperators', function () {
    const positiveRegexp = new RegExp(regexp.positiveOperators);
    it('should match base-line ++', function () {
      expect('++').to.match(positiveRegexp);
    });

    it('should match base-line :clap:', function () {
      expect(':clap:').to.match(positiveRegexp);
    });

    it('should match base-line :clap::skin-tone-1:', function () {
      expect(':clap::skin-tone-1:').to.match(positiveRegexp);
    });

    it('should match base-line :thumbsup:', function () {
      expect(':thumbsup:').to.match(positiveRegexp);
    });

    it('should match base-line :thumbsup::skin-tone-1:', function () {
      expect(':thumbsup::skin-tone-1:').to.match(positiveRegexp);
    });

    it('should match base-line :thumbsup_all:', function () {
      expect(':thumbsup_all:').to.match(positiveRegexp);
    });
  });

  describe('negativeOperators', function () {
    const negativeRegexp = new RegExp(regexp.negativeOperators);
    it('should match base-line --', function () {
      expect('--').to.match(negativeRegexp);
    });

    it('should match base-line :thumbsdown:', function () {
      expect(':thumbsdown:').to.match(negativeRegexp);
    });

    it('should match base-line :thumbsdown::skin-tone-1:', function () {
      expect(':thumbsdown::skin-tone-1:').to.match(negativeRegexp);
    });
  });

  describe('createAskForScoreRegExp', function () {
    forEach([
      ['score for @matt', 'for ', 'matt'],
      ['score @matt', undefined, 'matt'],
      ['score with @matt', 'with ', 'matt'],
      ['scores for @matt', 'for ', 'matt'],
      ['karma @phil', undefined, 'phil'],
      ['score @such.a.complex-name-hyphens', undefined, 'such.a.complex-name-hyphens'],
    ])
      .it('should match the search %j', (searchQuery, middleMatch, name) => {
        const scoreMatchRegExp = regexp.createAskForScoreRegExp();
        expect(scoreMatchRegExp).to.be.a('RegExp');
        expect(searchQuery.match(scoreMatchRegExp)).to.be.an('array');
        expect(searchQuery.match(scoreMatchRegExp).length).to.equal(3);
        expect(searchQuery.match(scoreMatchRegExp)).to.deep.equal([searchQuery, middleMatch, name]);
      });
  });

  describe('createEraseUserScoreRegExp', function () {
    forEach([
      ['erase @matt cuz he is bad', 'matt', 'he is bad'],
      ['erase @frank', 'frank', undefined],
    ]).it('%j should match the erase user regexp', (searchQuery, user, reason) => {
      const eraseUserScoreRegExp = regexp.createEraseUserScoreRegExp();
      expect(eraseUserScoreRegExp).to.be.a('RegExp');
      expect(searchQuery.match(eraseUserScoreRegExp)).to.be.an('array');
      expect(searchQuery.match(eraseUserScoreRegExp).length).to.equal(3);
      expect(searchQuery.match(eraseUserScoreRegExp)).to.deep.equal([searchQuery, user, reason]);
    });
  });

  describe('createMultiUserVoteRegExp', function () {
    forEach([
      ['{@matt, @phil}++', '{@matt, @phil}++', '@matt, @phil', '++', undefined],
      ['{@matt, @phil}-- cuz they are the best team', '{@matt, @phil}-- cuz they are the best team', '@matt, @phil', '--', 'they are the best team'],
      ['{@user, @phil.user}--', '{@user, @phil.user}--', '@user, @phil.user', '--', undefined],
      ['{ @darf, @greg, @tank } ++', '{ @darf, @greg, @tank } ++', '@darf, @greg, @tank ', '++', undefined],
    ])
      .it('should match \'%j\'', (fullText, firstMatch, names, operator, reason) => {
        const multiUserVoteRegExp = regexp.createMultiUserVoteRegExp();
        expect(multiUserVoteRegExp).to.be.a('RegExp');
        expect(fullText).to.match(multiUserVoteRegExp);
        const match = fullText.match(multiUserVoteRegExp);
        expect(match).to.be.an('array');
        expect(fullText.match(multiUserVoteRegExp).length).to.equal(4);
        expect(fullText.match(multiUserVoteRegExp)).to.deep.equal([firstMatch, names, operator, reason]);
      });
  });

  describe('createTopBottomRegExp', function () {
    forEach([
      ['top 10', 'top', '10'],
      ['bottom 5', 'bottom', '5'],
    ])
      .it('should match %j', (requestForScores, topOrBottom, numberOfUsers) => {
        const topBottomRegExp = regexp.createTopBottomRegExp();
        expect(topBottomRegExp).to.be.a('RegExp');
        expect(requestForScores).to.match(topBottomRegExp);
        const match = requestForScores.match(topBottomRegExp);
        expect(match).to.be.an('array');
        expect(match.length).to.equal(3);
        expect(match).to.deep.equal([requestForScores, topOrBottom, numberOfUsers]);
      });
  });

  describe('createTopBottomTokenRegExp', function () {
    forEach([
      ['top tokens 10', 'top', 'tokens', '10'],
      ['bottom tokens 5', 'bottom', 'tokens', '5'],
    ])
      .it('should match %j', (requestForScores, topOrBottom, token, numberOfUsers) => {
        const topBottomTokenRegExp = regexp.createTopBottomTokenRegExp();
        expect(topBottomTokenRegExp).to.be.a('RegExp');
        expect(requestForScores.match(topBottomTokenRegExp)).to.be.an('array');
        expect(requestForScores.match(topBottomTokenRegExp).length).to.equal(3);
        expect(requestForScores.match(topBottomTokenRegExp)).to.deep.equal([requestForScores, topOrBottom, numberOfUsers]);
      });
  });

  describe('createUpDownVoteRegExp', function () {
    describe('Matching names with @ symbols', function () {
      forEach([
        ['@matt++', '@matt++', 'matt', '++', undefined],
        ['@matt  ++   for being "great"', '@matt  ++   for being "great"', 'matt', '++', 'being "great"'],
        ['@matt++ cuz he is awesome', '@matt++ cuz he is awesome', 'matt', '++', 'he is awesome'],
        ['@matt ++ thanks for being awesome', '@matt ++ thanks for being awesome', 'matt', '++', 'being awesome'],
        ['@matt—', '@matt—', 'matt', '—', undefined],
      ]).it('should match name [%3$s] up/down [%4$s] with reason [%5$s]', (fullText, dummy, name, operator, reason) => {
        const upVoteOrDownVoteRegExp = regexp.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');
        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).to.match(upVoteOrDownVoteRegExp);
        expect(fullMatch).to.be.an('array');
        expect(fullMatch.length).to.equal(4);
        expect(fullMatch).to.deep.equal([fullText, name, operator, reason]);
      });
    });

    describe('Not matching names without @ symbols', function () {
      forEach([
        ['\'what are you doing\'--'],
        ['you are the best matt--'],
        ['\'you are the best matt\'--'],
        ['you are the best matt++ cuz you started #matt-s'],
        ['you are the best matt++ cuz you started #matt-s'],
        ['such.a.complex-name-hyphens++'],
        ['”such a complex-name-hyphens” ++'],
      ]).it("shouldn't match name [%1$s]", (text) => {
        const upVoteOrDownVoteRegExp = regexp.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');
        expect(text).not.to.match(upVoteOrDownVoteRegExp);
      });
    });
  });
});
