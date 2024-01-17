const { RegExpPlusPlus } = jest.requireActual('./regExpPlusPlus');

describe('RegExpPlusPlus', () => {
  describe('createGiveTokenRegExp', () => {
    it('should match a name + number', () => {
      const fullText = '@matt + 5';
      const expected = [fullText, undefined, 'matt', '5', undefined, undefined];
      expected.index = 0;
      expected.input = fullText;
      expected.groups = undefined;

      const giveTokenMatcher = RegExpPlusPlus.createGiveTokenRegExp();
      const match = fullText.match(giveTokenMatcher);
      expect(fullText).toMatch(giveTokenMatcher);
      expect(match).toEqual(expected);
    });
  });

  describe('positiveOperators', () => {
    let positiveRegexp;
    beforeEach(() => {
      positiveRegexp = new RegExp(RegExpPlusPlus.positiveOperators);
    });

    it('should match base-line ++', () => {
      expect('++').toMatch(positiveRegexp);
    });

    it('should match base-line :clap:', () => {
      expect(':clap:').toMatch(positiveRegexp);
    });

    it('should match base-line :clap::skin-tone-1:', () => {
      expect(':clap::skin-tone-1:').toMatch(positiveRegexp);
    });

    it('should match base-line :thumbsup:', () => {
      expect(':thumbsup:').toMatch(positiveRegexp);
    });

    it('should match base-line :thumbsup::skin-tone-1:', () => {
      expect(':thumbsup::skin-tone-1:').toMatch(positiveRegexp);
    });

    it('should match base-line :thumbsup_all:', () => {
      expect(':thumbsup_all:').toMatch(positiveRegexp);
    });
  });

  describe('negativeOperators', () => {
    let negativeRegexp;
    beforeEach(() => {
      negativeRegexp = new RegExp(RegExpPlusPlus.negativeOperators);
    });

    it('should match base-line --', () => {
      expect('--').toMatch(negativeRegexp);
    });

    it('should match base-line :thumbsdown:', () => {
      expect(':thumbsdown:').toMatch(negativeRegexp);
    });

    it('should match base-line :thumbsdown::skin-tone-1:', () => {
      expect(':thumbsdown::skin-tone-1:').toMatch(negativeRegexp);
    });
  });

  describe('createAskForScoreRegExp', () => {
    let askForScoreRegExp;
    beforeEach(() => {
      askForScoreRegExp = RegExpPlusPlus.createAskForScoreRegExp();
    });

    it('should match `score for @matt`', () => {
      const fullText = 'score for @matt';
      expect(askForScoreRegExp).toBeInstanceOf(RegExp);
      expect(Array.isArray(fullText.match(askForScoreRegExp))).toBe(true);
      expect(fullText.match(askForScoreRegExp).length).toBe(4);
      expect(fullText.match(askForScoreRegExp)[0]).toBe(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).toBeUndefined();
      expect(fullText.match(askForScoreRegExp)[2]).toBe('for ');
      expect(fullText.match(askForScoreRegExp)[3]).toBe('matt');
    });

    it('should match `score @matt`', () => {
      const fullText = 'score @matt';
      expect(askForScoreRegExp).toBeInstanceOf(RegExp);
      expect(Array.isArray(fullText.match(askForScoreRegExp))).toBe(true);
      expect(fullText.match(askForScoreRegExp).length).toBe(4);
      expect(fullText.match(askForScoreRegExp)[0]).toBe(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).toBeUndefined();
      expect(fullText.match(askForScoreRegExp)[2]).toBeUndefined();
      expect(fullText.match(askForScoreRegExp)[3]).toBe('matt');
    });

    it('should match `score with @matt`', () => {
      const fullText = 'score with @matt';
      expect(askForScoreRegExp).toBeInstanceOf(RegExp);
      expect(Array.isArray(fullText.match(askForScoreRegExp))).toBe(true);
      expect(fullText.match(askForScoreRegExp).length).toBe(4);
      expect(fullText.match(askForScoreRegExp)[0]).toBe(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).toBeUndefined();
      expect(fullText.match(askForScoreRegExp)[2]).toBe('with ');
      expect(fullText.match(askForScoreRegExp)[3]).toBe('matt');
    });

    it('should match `karma @phil`', () => {
      const fullText = 'karma @phil';
      expect(askForScoreRegExp).toBeInstanceOf(RegExp);
      expect(Array.isArray(fullText.match(askForScoreRegExp))).toBe(true);
      expect(fullText.match(askForScoreRegExp).length).toBe(4);
      expect(fullText.match(askForScoreRegExp)[0]).toBe(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).toBeUndefined();
      expect(fullText.match(askForScoreRegExp)[2]).toBeUndefined();
      expect(fullText.match(askForScoreRegExp)[3]).toBe('phil');
    });

    it('should match `score @such.a.complex-name-hyphens`', () => {
      const fullText = 'score @such.a.complex-name-hyphens';
      expect(askForScoreRegExp).toBeInstanceOf(RegExp);
      expect(Array.isArray(fullText.match(askForScoreRegExp))).toBe(true);
      expect(fullText.match(askForScoreRegExp).length).toBe(4);
      expect(fullText.match(askForScoreRegExp)[0]).toBe(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).toBeUndefined();
      expect(fullText.match(askForScoreRegExp)[2]).toBeUndefined();
      expect(fullText.match(askForScoreRegExp)[3]).toBe(
        'such.a.complex-name-hyphens',
      );
    });

    it('should match `what even should it be score with @matt`', () => {
      const fullText = 'what even should it be score with @matt';
      expect(askForScoreRegExp).toBeInstanceOf(RegExp);
      expect(Array.isArray(fullText.match(askForScoreRegExp))).toBe(true);
      expect(fullText.match(askForScoreRegExp).length).toBe(4);
      expect(fullText.match(askForScoreRegExp)[0]).toBe(fullText);
      expect(fullText.match(askForScoreRegExp)[1]).toBe(
        'what even should it be ',
      );
      expect(fullText.match(askForScoreRegExp)[2]).toBe('with ');
      expect(fullText.match(askForScoreRegExp)[3]).toBe('matt');
    });
  });

  describe('createEraseUserScoreRegExp', () => {
    it('`erase @matt cuz he is bad` should match the erase user regexp', () => {
      const fullText = 'erase @matt cuz he is bad';
      const expected = [fullText, undefined, 'matt', 'cuz', 'he is bad'];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      const eraseUserScoreRegExp = RegExpPlusPlus.createEraseUserScoreRegExp();
      expect(eraseUserScoreRegExp).toBeInstanceOf(RegExp);
      const match = fullText.match(eraseUserScoreRegExp);
      expect(Array.isArray(match)).toBe(true);
      expect(match.length).toBe(5);
      expect(match).toEqual(expected);
    });
    it('`erase @frank` should match the erase user regexp', () => {
      const fullText = 'erase @frank';
      const eraseUserScoreRegExp = RegExpPlusPlus.createEraseUserScoreRegExp();
      expect(eraseUserScoreRegExp).toBeInstanceOf(RegExp);
      expect(Array.isArray(fullText.match(eraseUserScoreRegExp))).toBe(true);
      expect(fullText.match(eraseUserScoreRegExp).length).toBe(5);
      expect(fullText.match(eraseUserScoreRegExp)[0]).toBe(fullText);
      expect(fullText.match(eraseUserScoreRegExp)[1]).toBeUndefined();
      expect(fullText.match(eraseUserScoreRegExp)[2]).toBe('frank');
      expect(fullText.match(eraseUserScoreRegExp)[3]).toBeUndefined();
      expect(fullText.match(eraseUserScoreRegExp)[4]).toBeUndefined();
    });
  });

  describe('createMultiUserVoteRegExp', () => {
    let multiUserVoteRegExp;
    beforeEach(() => {
      multiUserVoteRegExp = RegExpPlusPlus.createMultiUserVoteRegExp();
    });

    it("should match '{@matt, @phil}++'", () => {
      const fullText = '{@matt, @phil}++';
      const expected = [
        fullText,
        undefined,
        '@matt, @phil',
        '++',
        undefined,
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it("should match '{@matt, @phil}-- cuz they are the best team'", () => {
      const fullText = '{@matt, @phil}-- cuz they are the best team';
      const expected = [
        fullText,
        undefined,
        '@matt, @phil',
        '--',
        'cuz',
        'they are the best team',
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it("should match '{@user, @phil.user}--'", () => {
      const fullText = '{@user, @phil.user}--';
      const expected = [
        fullText,
        undefined,
        '@user, @phil.user',
        '--',
        undefined,
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it.skip("should match '{@user, @phil.user}-- --silent'", () => {
      const fullText = '{@user, @phil.user}-- --silent';
      const expected = [
        fullText,
        undefined,
        '@user, @phil.user',
        '--',
        undefined,
        '--silent',
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it("should match '{ @darf, @greg, @tank } ++'", () => {
      const fullText = '{ @darf, @greg, @tank } ++';
      const expected = [
        fullText,
        undefined,
        '@darf, @greg, @tank ',
        '++',
        undefined,
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it("should match 'where in the world is Carmen Sandiego { @carmen.sandiego, @sarah.nade, @eartha.brute, @double.trouble, @wonder.rat } ++'", () => {
      const fullText =
        'where in the world is Carmen Sandiego { @carmen.sandiego, @sarah.nade, @eartha.brute, @double.trouble, @wonder.rat } ++';
      const expected = [
        fullText,
        'where in the world is Carmen Sandiego ',
        '@carmen.sandiego, @sarah.nade, @eartha.brute, @double.trouble, @wonder.rat ',
        '++',
        undefined,
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it("should match '{@matt @phil}++'", () => {
      const fullText = '{@matt @phil}++';
      const expected = [
        fullText,
        undefined,
        '@matt @phil',
        '++',
        undefined,
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it("should match '( @matt, @phil )++'", () => {
      const fullText = '( @matt, @phil )++';
      const expected = [
        fullText,
        undefined,
        '@matt, @phil ',
        '++',
        undefined,
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it("should match '[ @matt : @phil ]++'", () => {
      const fullText = '[ @matt : @phil ]++';
      const expected = [
        fullText,
        undefined,
        '@matt : @phil ',
        '++',
        undefined,
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it("should match '[ @matt: @phil ]++'", () => {
      const fullText = '[ @matt: @phil ]++';
      const expected = [
        fullText,
        undefined,
        '@matt: @phil ',
        '++',
        undefined,
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it("should match '[ @matt:@phil ]++'", () => {
      const fullText = '[ @matt:@phil ]++';
      const expected = [
        fullText,
        undefined,
        '@matt:@phil ',
        '++',
        undefined,
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it("should match '{@matt,@phil}++'", () => {
      const fullText = '{@matt,@phil}++';
      const expected = [
        fullText,
        undefined,
        '@matt,@phil',
        '++',
        undefined,
        undefined,
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(match).toEqual(expected);
    });

    it('should match `{ @Chelo, @Kahou_Lei, @wimdec_PTO_back_Aug_21 , @guillaume_Back_Aug_6th, @Cherry,   @singaravelan   } ++  you’re all awesome, I’m only here for the fun!`', () => {
      const fullText =
        '{@Chelo, @Kahou_Lei, @wimdec_PTO_back_Aug_21 , @guillaume_Back_Aug_6th, @Cherry,   @singaravelan   }   ++    you’re all awesome, I’m only here for the fun!';

      const expected = [
        fullText,
        undefined,
        '@Chelo, @Kahou_Lei, @wimdec_PTO_back_Aug_21 , @guillaume_Back_Aug_6th, @Cherry,   @singaravelan   ',
        '++',
        undefined,
        'you’re all awesome, I’m only here for the fun!',
      ];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(multiUserVoteRegExp).toBeInstanceOf(RegExp);

      const match = fullText.match(multiUserVoteRegExp);
      expect(typeof match).toBe('object');
      expect(match.length).toBe(expected.length);
      expect(match).toEqual(expected);
    });
  });

  describe('createTopBottomRegExp', () => {
    it('should match top 10', () => {
      const topBottomRegExp = RegExpPlusPlus.createTopBottomRegExp();
      const expected = ['top 10', 'top', '10'];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(topBottomRegExp).toBeInstanceOf(RegExp);
      expect(expected[0]).toMatch(topBottomRegExp);
      const match = expected[0].match(topBottomRegExp);
      expect(Array.isArray(match)).toBe(true);
      expect(match.length).toBe(expected.length);
      expect(match).toEqual(expected);
    });
    it('should match bottom 5', () => {
      const topBottomRegExp = RegExpPlusPlus.createTopBottomRegExp();
      const expected = ['bottom 5', 'bottom', '5'];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(topBottomRegExp).toBeInstanceOf(RegExp);
      expect(expected[0]).toMatch(topBottomRegExp);
      const match = expected[0].match(topBottomRegExp);
      expect(Array.isArray(match)).toBe(true);
      expect(match.length).toBe(expected.length);
      expect(match).toEqual(expected);
    });
  });

  describe('createTopBottomTokenRegExp', () => {
    it('should match top tokens 10', () => {
      const topBottomTokenRegExp = RegExpPlusPlus.createTopBottomTokenRegExp();
      const expected = ['top tokens 10', 'top', '10'];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(topBottomTokenRegExp).toBeInstanceOf(RegExp);
      expect(expected[0]).toMatch(topBottomTokenRegExp);
      const match = expected[0].match(topBottomTokenRegExp);
      expect(Array.isArray(match)).toBe(true);
      expect(match.length).toBe(expected.length);
      expect(match).toEqual(expected);
    });
    it('should match bottom tokens 5', () => {
      const topBottomRegExp = RegExpPlusPlus.createTopBottomTokenRegExp();
      const expected = ['bottom tokens 5', 'bottom', '5'];
      expected.index = 0;
      expected.input = expected[0];
      expected.groups = undefined;

      expect(topBottomRegExp).toBeInstanceOf(RegExp);
      expect(expected[0]).toMatch(topBottomRegExp);
      const match = expected[0].match(topBottomRegExp);
      expect(Array.isArray(match)).toBe(true);
      expect(match.length).toBe(expected.length);
      expect(match).toEqual(expected);
    });
  });

  describe('createUpDownVoteRegExp', () => {
    describe('Matching names with @ symbols', () => {
      it('should match name [@matt] up/down [++] with reason [undefined]', () => {
        const fullText = '@matt++';
        const expected = [
          fullText,
          undefined,
          'matt',
          '++',
          undefined,
          undefined,
        ];
        expected.index = 0;
        expected.input = '@matt++';
        expected.groups = undefined;

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).toMatch(upVoteOrDownVoteRegExp);
        expect(Array.isArray(fullMatch)).toBe(true);
        expect(fullMatch.length).toBe(6);
        expect(fullMatch).toEqual(expected);
      });

      it.skip('should match name [@matt] up/down [++] with reason [undefined] and [--silent] flag', () => {
        const fullText = '@matt++ --silent';
        const expected = [
          fullText,
          undefined,
          'matt',
          '++',
          undefined,
          '--silent',
        ];
        expected.index = 0;
        expected.input = '@matt++';
        expected.groups = undefined;

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).toMatch(upVoteOrDownVoteRegExp);
        expect(Array.isArray(fullMatch)).toBe(true);
        expect(fullMatch.length).toBe(6);
        expect(fullMatch).toEqual(expected);
      });

      it('should match name [@matt] up/down [++] with reason [for being "great"]', () => {
        const fullText = '@matt  ++   for being "great"';
        const expected = [
          fullText,
          undefined,
          'matt',
          '++',
          'for',
          'being "great"',
        ];
        expected.index = 0;
        expected.input = fullText;
        expected.groups = undefined;

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).toMatch(upVoteOrDownVoteRegExp);
        expect(Array.isArray(fullMatch)).toBe(true);
        expect(fullMatch.length).toBe(6);
        expect(fullMatch).toEqual(expected);
      });

      it('should match name [@matt] up/down [++] with reason [cuz he is awesome]', () => {
        const fullText = '@matt++ cuz he is awesome';
        const expected = [
          fullText,
          undefined,
          'matt',
          '++',
          'cuz',
          'he is awesome',
        ];
        expected.index = 0;
        expected.input = fullText;
        expected.groups = undefined;

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).toMatch(upVoteOrDownVoteRegExp);
        expect(Array.isArray(fullMatch)).toBe(true);
        expect(fullMatch.length).toBe(6);
        expect(fullMatch).toEqual(expected);
      });

      it('should match name [@matt] up/down [++] with reason [thanks for being awesome]', () => {
        const fullText = '@matt ++ thanks for being awesome';
        const expected = [
          fullText,
          undefined,
          'matt',
          '++',
          'thanks for',
          'being awesome',
        ];
        expected.index = 0;
        expected.input = fullText;
        expected.groups = undefined;

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).toMatch(upVoteOrDownVoteRegExp);
        expect(Array.isArray(fullMatch)).toBe(true);
        expect(fullMatch.length).toBe(6);
        expect(fullMatch).toEqual(expected);
      });

      it('should match name [@matt] up/down [—] with reason [undefined]', () => {
        const fullText = '@matt—';
        const expected = [
          fullText,
          undefined,
          'matt',
          '—',
          undefined,
          undefined,
        ];
        expected.index = 0;
        expected.input = fullText;
        expected.groups = undefined;

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).toMatch(upVoteOrDownVoteRegExp);
        expect(Array.isArray(fullMatch)).toBe(true);
        expect(fullMatch.length).toBe(6);
        expect(fullMatch).toEqual(expected);
      });

      it('should match name [@matt] up/down [++] with reason [undefined]', () => {
        const fullText = 'hello world this is @matt++';
        const expected = [
          fullText,
          'hello world this is ',
          'matt',
          '++',
          undefined,
          undefined,
        ];
        expected.index = 0;
        expected.input = fullText;
        expected.groups = undefined;

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).toMatch(upVoteOrDownVoteRegExp);
        expect(Array.isArray(fullMatch)).toBe(true);
        expect(fullMatch.length).toBe(6);
        expect(fullMatch).toEqual(expected);
      });

      it("should match name [@matt] up/down [++] with reason [man, you're awesome]", () => {
        const fullText = "@matt ++ man, you're awesome";
        const expected = [
          fullText,
          undefined,
          'matt',
          '++',
          undefined,
          "man, you're awesome",
        ];
        expected.index = 0;
        expected.input = fullText;
        expected.groups = undefined;

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        const fullMatch = fullText.match(upVoteOrDownVoteRegExp);
        expect(fullText).toMatch(upVoteOrDownVoteRegExp);
        expect(Array.isArray(fullMatch)).toBe(true);
        expect(fullMatch.length).toBe(6);
        expect(fullMatch).toEqual(expected);
      });
    });

    describe('Not matching names without @ symbols', () => {
      it("shouldn't match name ['what are you doing']--", () => {
        const text = "'what are you doing'--";

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        expect(text).not.toMatch(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['you are the best matt']--", () => {
        const text = 'you are the best matt--';

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        expect(text).not.toMatch(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['you are the best matt']--", () => {
        const text = "'you are the best matt'--";

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        expect(text).not.toMatch(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['you are the best matt']++ cuz you started #matt-s", () => {
        const text = 'you are the best matt++ cuz you started #matt-s';

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        expect(text).not.toMatch(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['you are the best matt']++ cuz you started #matt-s", () => {
        const text = 'you are the best matt++ cuz you started #matt-s';

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        expect(text).not.toMatch(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['such.a.complex-name-hyphens']++", () => {
        const text = 'such.a.complex-name-hyphens++';

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        expect(text).not.toMatch(upVoteOrDownVoteRegExp);
      });

      it("shouldn't match name ['”such a complex-name-hyphens”'] ++", () => {
        const text = '”such a complex-name-hyphens” ++';

        const upVoteOrDownVoteRegExp = RegExpPlusPlus.createUpDownVoteRegExp();
        expect(upVoteOrDownVoteRegExp).toBeInstanceOf(RegExp);

        expect(text).not.toMatch(upVoteOrDownVoteRegExp);
      });
    });
  });
});
