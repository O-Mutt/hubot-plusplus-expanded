/* eslint-disable new-cap */
/* eslint-disable mocha/no-setup-in-describe */
const chai = require('chai');
chai.use(require('sinon-chai'));

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
    let askForScoreRegExp;
    beforeEach(() => {
      askForScoreRegExp = RegExpPlusPlus.createAskForScoreRegExp();
    });
    it('should match `score for @matt`', () => {
      const fullText = 'score for @matt';
      expect(askForScoreRegExp).to.be.a('RegExp');
      expect(fullText.match(askForScoreRegExp)).to.be.an('array');
      expect(fullText.match(askForScoreRegExp).length).to.equal(4);
      expect(fullText.match(askForScoreRegExp)[0]).to.equal(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).to.be.undefined;
      expect(fullText.match(askForScoreRegExp)[2]).to.equal('for ');
      expect(fullText.match(askForScoreRegExp)[3]).to.equal('matt');
    });

    it('should match `score @matt`', () => {
      const fullText = 'score @matt';
      expect(askForScoreRegExp).to.be.a('RegExp');
      expect(fullText.match(askForScoreRegExp)).to.be.an('array');
      expect(fullText.match(askForScoreRegExp).length).to.equal(4);
      expect(fullText.match(askForScoreRegExp)[0]).to.equal(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).to.be.undefined;
      expect(fullText.match(askForScoreRegExp)[2]).to.be.undefined;
      expect(fullText.match(askForScoreRegExp)[3]).to.equal('matt');
    });

    it('should match `score with @matt`', () => {
      const fullText = 'score with @matt';
      expect(askForScoreRegExp).to.be.a('RegExp');
      expect(fullText.match(askForScoreRegExp)).to.be.an('array');
      expect(fullText.match(askForScoreRegExp).length).to.equal(4);
      expect(fullText.match(askForScoreRegExp)[0]).to.equal(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).to.be.undefined;
      expect(fullText.match(askForScoreRegExp)[2]).to.equal('with ');
      expect(fullText.match(askForScoreRegExp)[3]).to.equal('matt');
    });

    it('should match `karma @phil`', () => {
      const fullText = 'karma @phil';
      expect(askForScoreRegExp).to.be.a('RegExp');
      expect(fullText.match(askForScoreRegExp)).to.be.an('array');
      expect(fullText.match(askForScoreRegExp).length).to.equal(4);
      expect(fullText.match(askForScoreRegExp)[0]).to.equal(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).to.be.undefined;
      expect(fullText.match(askForScoreRegExp)[2]).to.be.undefined;
      expect(fullText.match(askForScoreRegExp)[3]).to.equal('phil');
    });

    it('should match `score @such.a.complex-name-hyphens`', () => {
      const fullText = 'score @such.a.complex-name-hyphens';
      expect(askForScoreRegExp).to.be.a('RegExp');
      expect(fullText.match(askForScoreRegExp)).to.be.an('array');
      expect(fullText.match(askForScoreRegExp).length).to.equal(4);
      expect(fullText.match(askForScoreRegExp)[0]).to.equal(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).to.be.undefined;
      expect(fullText.match(askForScoreRegExp)[2]).to.be.undefined;
      expect(fullText.match(askForScoreRegExp)[3]).to.equal(
        'such.a.complex-name-hyphens',
      );
    });

    it('should match `what even should it be score with @matt`', () => {
      const fullText = 'what even should it be score with @matt';
      expect(askForScoreRegExp).to.be.a('RegExp');
      expect(fullText.match(askForScoreRegExp)).to.be.an('array');
      expect(fullText.match(askForScoreRegExp).length).to.equal(4);
      expect(fullText.match(askForScoreRegExp)[0]).to.equal(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).to.equal(
        'what even should it be ',
      );
      expect(fullText.match(askForScoreRegExp)[2]).to.equal('with ');
      expect(fullText.match(askForScoreRegExp)[3]).to.equal('matt');
    });
  });

  describe('createEraseUserScoreRegExp', () => {
    it('`erase @matt cuz he is bad` should match the erase user regexp', () => {
      const fullText = 'erase @matt cuz he is bad';
      const eraseUserScoreRegExp = RegExpPlusPlus.createEraseUserScoreRegExp();
      expect(eraseUserScoreRegExp).to.be.a('RegExp');
      expect(fullText.match(eraseUserScoreRegExp)).to.be.an('array');
      expect(fullText.match(eraseUserScoreRegExp).length).to.equal(5);
      expect(fullText.match(eraseUserScoreRegExp)[0]).to.equal(
        'erase @matt cuz he is bad',
      );
      expect(fullText.match(eraseUserScoreRegExp)[1]).to.be.undefined;
      expect(fullText.match(eraseUserScoreRegExp)[2]).to.equal('matt');
      expect(fullText.match(eraseUserScoreRegExp)[3]).to.equal('cuz');
      expect(fullText.match(eraseUserScoreRegExp)[4]).to.equal('he is bad');
    });
    it('`erase @frank` should match the erase user regexp', () => {
      const fullText = 'erase @frank';
      const eraseUserScoreRegExp = RegExpPlusPlus.createEraseUserScoreRegExp();
      expect(eraseUserScoreRegExp).to.be.a('RegExp');
      expect(fullText.match(eraseUserScoreRegExp)).to.be.an('array');
      expect(fullText.match(eraseUserScoreRegExp).length).to.equal(5);
      expect(fullText.match(eraseUserScoreRegExp)[0]).to.equal(fullText);
      expect(fullText.match(eraseUserScoreRegExp)[1]).to.be.undefined;
      expect(fullText.match(eraseUserScoreRegExp)[2]).to.equal('frank');
      expect(fullText.match(eraseUserScoreRegExp)[3]).to.be.undefined;
      expect(fullText.match(eraseUserScoreRegExp)[4]).to.be.undefined;
    });
  });

  describe('createMultiUserVoteRegExp', () => {
    let multiUserVoteRegExp;
    beforeEach(() => {
      multiUserVoteRegExp = RegExpPlusPlus.createMultiUserVoteRegExp();
    });
    it("should match '{@matt, @phil}++'", () => {
      const fullText = '{@matt, @phil}++';
      const expectedMatch = [
        fullText,
        undefined,
        '@matt, @phil',
        '++',
        undefined,
        undefined,
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });

    it("should match '{@matt, @phil}-- cuz they are the best team'", () => {
      const fullText = '{@matt, @phil}-- cuz they are the best team';
      const expectedMatch = [
        fullText,
        undefined,
        '@matt, @phil',
        '--',
        'cuz',
        'they are the best team',
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });

    it("should match '{@user, @phil.user}--'", () => {
      const fullText = '{@user, @phil.user}--';
      const expectedMatch = [
        fullText,
        undefined,
        '@user, @phil.user',
        '--',
        undefined,
        undefined,
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });

    it("should match '{ @darf, @greg, @tank } ++'", () => {
      const fullText = '{ @darf, @greg, @tank } ++';
      const expectedMatch = [
        fullText,
        undefined,
        '@darf, @greg, @tank ',
        '++',
        undefined,
        undefined,
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });

    it("should match 'where in the world is Carmen Sandiego { @carmen.sandiego, @sarah.nade, @eartha.brute, @double.trouble, @wonder.rat } ++'", () => {
      const fullText =
        'where in the world is Carmen Sandiego { @carmen.sandiego, @sarah.nade, @eartha.brute, @double.trouble, @wonder.rat } ++';
      const expectedMatch = [
        fullText,
        'where in the world is Carmen Sandiego ',
        '@carmen.sandiego, @sarah.nade, @eartha.brute, @double.trouble, @wonder.rat ',
        '++',
        undefined,
        undefined,
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });

    it("should match '{@matt @phil}++'", () => {
      const fullText = '{@matt @phil}++';
      const expectedMatch = [
        fullText,
        undefined,
        '@matt @phil',
        '++',
        undefined,
        undefined,
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });

    it("should match '( @matt, @phil )++'", () => {
      const fullText = '( @matt, @phil )++';
      const expectedMatch = [
        fullText,
        undefined,
        '@matt, @phil ',
        '++',
        undefined,
        undefined,
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });

    it("should match '[ @matt : @phil ]++'", () => {
      const fullText = '[ @matt : @phil ]++';
      const expectedMatch = [
        fullText,
        undefined,
        '@matt : @phil ',
        '++',
        undefined,
        undefined,
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });

    it("should match '[ @matt: @phil ]++'", () => {
      const fullText = '[ @matt: @phil ]++';
      const expectedMatch = [
        fullText,
        undefined,
        '@matt: @phil ',
        '++',
        undefined,
        undefined,
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });

    it("should match '[ @matt:@phil ]++'", () => {
      const fullText = '[ @matt:@phil ]++';
      const expectedMatch = [
        fullText,
        undefined,
        '@matt:@phil ',
        '++',
        undefined,
        undefined,
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });

    it("should match '{@matt,@phil}++'", () => {
      const fullText = '{@matt,@phil}++';
      const expectedMatch = [
        fullText,
        undefined,
        '@matt,@phil',
        '++',
        undefined,
        undefined,
      ];

      expect(multiUserVoteRegExp).to.be.a('RegExp');

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).to.deep.equal(expectedMatch);
    });
  });

  describe('createTopBottomRegExp', () => {
    it('should match top 10', () => {
      const topBottomRegExp = RegExpPlusPlus.createTopBottomRegExp();
      const expected = ['top 10', 'top', '10'];
      expect(topBottomRegExp).to.be.a('RegExp');
      expect(expected[0]).to.match(topBottomRegExp);
      const match = expected[0].match(topBottomRegExp);
      expect(match).to.be.an('array');
      expect(match.length).to.equal(expected.length);
      expect(match).to.deep.equal(expected);
    });
    it('should match bottom 5', () => {
      const topBottomRegExp = RegExpPlusPlus.createTopBottomRegExp();
      const expected = ['bottom 5', 'bottom', '5'];
      expect(topBottomRegExp).to.be.a('RegExp');
      expect(expected[0]).to.match(topBottomRegExp);
      const match = expected[0].match(topBottomRegExp);
      expect(match).to.be.an('array');
      expect(match.length).to.equal(expected.length);
      expect(match).to.deep.equal(expected);
    });
  });

  describe('createTopBottomTokenRegExp', () => {
    it('should match top tokens 10', () => {
      const topBottomTokenRegExp = RegExpPlusPlus.createTopBottomTokenRegExp();
      const expected = ['top tokens 10', 'top', '10'];
      expect(topBottomTokenRegExp).to.be.a('RegExp');
      expect(expected[0]).to.match(topBottomTokenRegExp);
      const match = expected[0].match(topBottomTokenRegExp);
      expect(match).to.be.an('array');
      expect(match.length).to.equal(expected.length);
      expect(match).to.deep.equal(expected);
    });
    it('should match bottom tokens 5', () => {
      const topBottomRegExp = RegExpPlusPlus.createTopBottomTokenRegExp();
      const expected = ['bottom tokens 5', 'bottom', '5'];
      expect(topBottomRegExp).to.be.a('RegExp');
      expect(expected[0]).to.match(topBottomRegExp);
      const match = expected[0].match(topBottomRegExp);
      expect(match).to.be.an('array');
      expect(match.length).to.equal(expected.length);
      expect(match).to.deep.equal(expected);
    });
  });

  describe('createUpDownVoteRegExp', () => {
    describe('Matching names with @ symbols', () => {
      it('should match name [matt] up/down [++] with reason [undefined]', () => {
        const fullText = '@matt++';
        const expectedMatch = [
          fullText,
          undefined,
          'matt',
          '++',
          undefined,
          undefined,
        ];

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).to.match(upVoteOrDownVoteRegExp);
        expect(fullMatch).to.be.an('array');
        expect(fullMatch.length).to.equal(6);
        expect(fullMatch).to.deep.equal(expectedMatch);
      });

      it('should match name [matt] up/down [++] with reason [for being "great"]', () => {
        const fullText = '@matt  ++   for being "great"';
        const expectedMatch = [
          fullText,
          undefined,
          'matt',
          '++',
          'for',
          'being "great"',
        ];

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).to.match(upVoteOrDownVoteRegExp);
        expect(fullMatch).to.be.an('array');
        expect(fullMatch.length).to.equal(6);
        expect(fullMatch).to.deep.equal(expectedMatch);
      });

      it('should match name [matt] up/down [++] with reason [cuz he is awesome]', () => {
        const fullText = '@matt++ cuz he is awesome';
        const expectedMatch = [
          fullText,
          undefined,
          'matt',
          '++',
          'cuz',
          'he is awesome',
        ];

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).to.match(upVoteOrDownVoteRegExp);
        expect(fullMatch).to.be.an('array');
        expect(fullMatch.length).to.equal(6);
        expect(fullMatch).to.deep.equal(expectedMatch);
      });

      it('should match name [matt] up/down [++] with reason [thanks for being awesome]', () => {
        const fullText = '@matt ++ thanks for being awesome';
        const expectedMatch = [
          fullText,
          undefined,
          'matt',
          '++',
          'thanks for',
          'being awesome',
        ];

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).to.match(upVoteOrDownVoteRegExp);
        expect(fullMatch).to.be.an('array');
        expect(fullMatch.length).to.equal(6);
        expect(fullMatch).to.deep.equal(expectedMatch);
      });

      it('should match name [matt] up/down [—] with reason [undefined]', () => {
        const fullText = '@matt—';
        const expectedMatch = [
          fullText,
          undefined,
          'matt',
          '—',
          undefined,
          undefined,
        ];

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).to.match(upVoteOrDownVoteRegExp);
        expect(fullMatch).to.be.an('array');
        expect(fullMatch.length).to.equal(6);
        expect(fullMatch).to.deep.equal(expectedMatch);
      });

      it('should match name [matt] up/down [++] with reason [undefined]', () => {
        const fullText = 'hello world this is @matt++';
        const expectedMatch = [
          fullText,
          'hello world this is ',
          'matt',
          '++',
          undefined,
          undefined,
        ];

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).to.match(upVoteOrDownVoteRegExp);
        expect(fullMatch).to.be.an('array');
        expect(fullMatch.length).to.equal(6);
        expect(fullMatch).to.deep.equal(expectedMatch);
      });

      it("should match name [matt] up/down [++] with reason [man, you're awesome]", () => {
        const fullText = "@matt ++ man, you're awesome";
        const expectedMatch = [
          fullText,
          undefined,
          'matt',
          '++',
          undefined,
          "man, you're awesome",
        ];

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).to.match(upVoteOrDownVoteRegExp);
        expect(fullMatch).to.be.an('array');
        expect(fullMatch.length).to.equal(6);
        expect(fullMatch).to.deep.equal(expectedMatch);
      });
    });

    describe('Not matching names without @ symbols', () => {
      it("shouldn't match name ['what are you doing']--", () => {
        const text = "'what are you doing'--";

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        expect(text).not.to.match(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['you are the best matt']--", () => {
        const text = 'you are the best matt--';

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        expect(text).not.to.match(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['you are the best matt']--", () => {
        const text = "'you are the best matt'--";

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        expect(text).not.to.match(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['you are the best matt']++ cuz you started #matt-s", () => {
        const text = 'you are the best matt++ cuz you started #matt-s';

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        expect(text).not.to.match(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['you are the best matt']++ cuz you started #matt-s", () => {
        const text = 'you are the best matt++ cuz you started #matt-s';

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        expect(text).not.to.match(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['such.a.complex-name-hyphens']++", () => {
        const text = 'such.a.complex-name-hyphens++';

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        expect(text).not.to.match(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['”such a complex-name-hyphens”'] ++", () => {
        const text = '”such a complex-name-hyphens” ++';

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).to.be.a('RegExp');

        expect(text).not.to.match(upVoteOrDownVoteRegExp);
      });
    });
  });
});
