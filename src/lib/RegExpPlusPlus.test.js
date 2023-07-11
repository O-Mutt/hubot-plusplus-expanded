/* eslint-disable new-cap */
/* eslint-disable mocha/no-setup-in-describe */
const chai = require('chai');
const forEach = require('mocha-each');

const { expect } = chai;

const RegExpPlusPlus = require('./RegExpPlusPlus');

describe('RegExpPlusPlus', () => {
  describe('createGiveTokenRegExp', () => {
    it('should match a name + number', () => {
      const giveTokenMatcher = RegExpPlusPlus.createGiveTokenRegExp();
      const match = '@matt + 5'.match(giveTokenMatcher);
      expect('@matt + 5').to.match(giveTokenMatcher);
      expect(match).to.be.an('array').that.include('matt', '+', '5');
    });
  });

  describe('positiveOperators', () => {
    const positiveRegexp = new RegExp(RegExpPlusPlus.positiveOperators);
    it('should match base-line ++', () => {
      expect('++').to.match(positiveRegexp);
    });

    it('should match base-line :clap:', () => {
      expect(':clap:').to.match(positiveRegexp);
    });

    it('should match base-line :clap::skin-tone-1:', () => {
      expect(':clap::skin-tone-1:').to.match(positiveRegexp);
    });

    it('should match base-line :thumbsup:', () => {
      expect(':thumbsup:').to.match(positiveRegexp);
    });

    it('should match base-line :thumbsup::skin-tone-1:', () => {
      expect(':thumbsup::skin-tone-1:').to.match(positiveRegexp);
    });

    it('should match base-line :thumbsup_all:', () => {
      expect(':thumbsup_all:').to.match(positiveRegexp);
    });
  });

  describe('negativeOperators', () => {
    const negativeRegexp = new RegExp(RegExpPlusPlus.negativeOperators);
    it('should match base-line --', () => {
      expect('--').to.match(negativeRegexp);
    });

    it('should match base-line :thumbsdown:', () => {
      expect(':thumbsdown:').to.match(negativeRegexp);
    });

    it('should match base-line :thumbsdown::skin-tone-1:', () => {
      expect(':thumbsdown::skin-tone-1:').to.match(negativeRegexp);
    });
  });

  describe('createAskForScoreRegExp', () => {
    forEach([
      ['score for @matt', undefined, 'for ', 'matt'],
      ['score @matt', undefined, undefined, 'matt'],
      ['score with @matt', undefined, 'with ', 'matt'],
      ['scores for @matt', undefined, 'for ', 'matt'],
      ['karma @phil', undefined, undefined, 'phil'],
      ['score @such.a.complex-name-hyphens', undefined, undefined, 'such.a.complex-name-hyphens'],
      ['what even should it be score with @matt', 'what even should it be ', 'with ', 'matt'],
    ])
      .it('should match the search %j', (fullText, premessage, conjunction, name) => {
        const scoreMatchRegExp = RegExpPlusPlus.createAskForScoreRegExp();
        expect(scoreMatchRegExp).to.be.a('RegExp');
        expect(fullText.match(scoreMatchRegExp)).to.be.an('array');
        expect(fullText.match(scoreMatchRegExp).length).to.equal(4);
        expect(fullText.match(scoreMatchRegExp)).to.deep.equal([fullText, premessage, conjunction, name]);
      });
  });

  describe('createEraseUserScoreRegExp', () => {
    forEach([
      ['erase @matt cuz he is bad', undefined, 'matt', 'cuz', 'he is bad'],
      ['erase @frank', undefined, 'frank', undefined, undefined],
    ]).it('%j should match the erase user regexp', (fullText, premessage, user, conjunction, reason) => {
      const eraseUserScoreRegExp = RegExpPlusPlus.createEraseUserScoreRegExp();
      expect(eraseUserScoreRegExp).to.be.a('RegExp');
      expect(fullText.match(eraseUserScoreRegExp)).to.be.an('array');
      expect(fullText.match(eraseUserScoreRegExp).length).to.equal(5);
      expect(fullText.match(eraseUserScoreRegExp)).to.deep.equal([fullText, premessage, user, conjunction, reason]);
    });
  });

  describe('createMultiUserVoteRegExp', () => {
    forEach([
      ['{@matt, @phil}++', undefined, '@matt, @phil', '++', undefined, undefined],
      ['{@matt, @phil}-- cuz they are the best team', undefined, '@matt, @phil', '--', 'cuz', 'they are the best team'],
      ['{@user, @phil.user}--', undefined, '@user, @phil.user', '--', undefined, undefined],
      ['{ @darf, @greg, @tank } ++', undefined, '@darf, @greg, @tank ', '++', undefined, undefined],
      ['where in the world is Carmen Sandiego { @carmen.sandiego, @sarah.nade, @eartha.brute, @double.trouble, @wonder.rat } ++', 'where in the world is Carmen Sandiego ', '@carmen.sandiego, @sarah.nade, @eartha.brute, @double.trouble, @wonder.rat ', '++', undefined, undefined],
      ['{@matt @phil}++', undefined, '@matt @phil', '++', undefined, undefined],
      ['( @matt, @phil )++', undefined, '@matt, @phil ', '++', undefined, undefined],
      ['[ @matt : @phil ]++', undefined, '@matt : @phil ', '++', undefined, undefined],
      ['[ @matt: @phil ]++', undefined, '@matt: @phil ', '++', undefined, undefined],
      ['[ @matt:@phil ]++', undefined, '@matt:@phil ', '++', undefined, undefined],
      ['{@matt,@phil}++', undefined, '@matt,@phil', '++', undefined, undefined],
    ])
      .it('should match \'%j\'', (fullText, premessage, names, operator, conjunction, reason) => {
        const multiUserVoteRegExp = RegExpPlusPlus.createMultiUserVoteRegExp();
        expect(multiUserVoteRegExp).to.be.a('RegExp');
        expect(fullText).to.match(multiUserVoteRegExp);
        const match = fullText.match(multiUserVoteRegExp);
        expect(match).to.be.an('array');
        expect(match.length).to.equal(6);
        expect(match).to.deep.equal([fullText, premessage, names, operator, conjunction, reason]);
      });
  });

  describe('createTopBottomRegExp', () => {
    forEach([
      ['top 10', 'top', '10'],
      ['bottom 5', 'bottom', '5'],
    ])
      .it('should match %j', (requestForScores, topOrBottom, numberOfUsers) => {
        const topBottomRegExp = RegExpPlusPlus.createTopBottomRegExp();
        expect(topBottomRegExp).to.be.a('RegExp');
        expect(requestForScores).to.match(topBottomRegExp);
        const match = requestForScores.match(topBottomRegExp);
        expect(match).to.be.an('array');
        expect(match.length).to.equal(3);
        expect(match).to.deep.equal([requestForScores, topOrBottom, numberOfUsers]);
      });
  });

  describe('createTopBottomTokenRegExp', () => {
    forEach([
      ['top tokens 10', 'top', 'tokens', '10'],
      ['bottom tokens 5', 'bottom', 'tokens', '5'],
    ])
      .it('should match %j', (requestForScores, topOrBottom, token, numberOfUsers) => {
        const topBottomTokenRegExp = RegExpPlusPlus.createTopBottomTokenRegExp();
        expect(topBottomTokenRegExp).to.be.a('RegExp');
        expect(requestForScores).to.match(topBottomTokenRegExp);
        const match = requestForScores.match(topBottomTokenRegExp);
        expect(match).to.be.an('array');
        expect(match.length).to.equal(3);
        expect(match).to.deep.equal([requestForScores, topOrBottom, numberOfUsers]);
      });
  });

  describe('createUpDownVoteRegExp', () => {
    describe('Matching names with @ symbols', () => {
      forEach([
        ['@matt++', undefined, 'matt', '++', undefined, undefined],
        ['@matt  ++   for being "great"', undefined, 'matt', '++', 'for', 'being "great"'],
        ['@matt++ cuz he is awesome', undefined, 'matt', '++', 'cuz', 'he is awesome'],
        ['@matt ++ thanks for being awesome', undefined, 'matt', '++', 'thanks for', 'being awesome'],
        ['@matt—', undefined, 'matt', '—', undefined, undefined],
        ['hello world this is @matt++', 'hello world this is ', 'matt', '++', undefined, undefined],
        ['@matt ++ man, you\'re awesome', undefined, 'matt', '++', undefined, 'man, you\'re awesome'],
      ]).it('should match name [%3$s] up/down [%4$s] with reason [%5$s]', (fullText, premessage, name, operator, conjunction, reason) => {
        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');
        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).to.match(upVoteOrDownVoteRegExp);
        expect(fullMatch).to.be.an('array');
        expect(fullMatch.length).to.equal(6);
        expect(fullMatch).to.deep.equal([fullText, premessage, name, operator, conjunction, reason]);
      });
    });

    describe('Not matching names without @ symbols', () => {
      forEach([
        ['\'what are you doing\'--'],
        ['you are the best matt--'],
        ['\'you are the best matt\'--'],
        ['you are the best matt++ cuz you started #matt-s'],
        ['you are the best matt++ cuz you started #matt-s'],
        ['such.a.complex-name-hyphens++'],
        ['”such a complex-name-hyphens” ++'],
      ]).it("shouldn't match name [%1$s]", (text) => {
        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');
        expect(text).not.to.match(upVoteOrDownVoteRegExp);
      });
    });
  });
});
