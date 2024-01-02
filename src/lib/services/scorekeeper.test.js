const { H } = require('../helpers');
const { wait } = require('../../../test/test_helpers');

describe('ScoreKeeper', () => {
  let instance;
  beforeEach(async () => {
    instance = require('./scorekeeper');
  });

  afterEach(async () => {});

  describe('adding', () => {
    it('should add 1 point to "pointReceiver" with no reason and return the expected result', async () => {
      const to = 'pointReceiver';
      const from = { name: 'pointSender', id: '123' };
      const room = 'room';
      const reason = undefined;
      const expectedResult = { score: 1, reasons: {} };

      const beforeUser = await instance.getUser(mockRobot, to);
      expect(beforeUser.score).toBe(0);

      const { toUser: r } = await instance.incrementScore(
        mockRobot,
        to,
        from,
        room,
        reason,
        1,
      );
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(expectedResult.score);
      expect(r.reasons['because points']).toBe(
        expectedResult.reasons['because points'],
      );

      const afterUser = await instance.getUser(mockRobot, to);
      expect(afterUser.score).toBe(1);
    });

    it('should add 1 point to "pointReceiver" with reason "because points" and return the expected result', async () => {
      const to = 'pointReceiver';
      const from = { name: 'pointSender', id: '123' };
      const room = 'room';
      const reason = 'because points';
      const expectedResult = { score: 1, reasons: { 'because points': 1 } };

      const beforeUser = await instance.getUser(mockRobot, to);
      expect(beforeUser.score).toBe(0);

      const { toUser: r } = await instance.incrementScore(
        mockRobot,
        to,
        from,
        room,
        reason,
        1,
      );
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(expectedResult.score);
      expect(r.reasons['because points']).toBe(
        expectedResult.reasons['because points'],
      );

      const afterUser = await instance.getUser(mockRobot, to);
      expect(afterUser.score).toBe(1);
    });

    it('should add 1 point to "to.name-hyphenated" with no reason and return the expected result', async () => {
      const to = 'to.name-hyphenated';
      const from = { name: 'pointSender', id: '123' };
      const room = 'room';
      const reason = undefined;
      const expectedResult = { score: 1, reasons: {} };

      const beforeUser = await instance.getUser(mockRobot, to);
      expect(beforeUser.score).toBe(0);

      const { toUser: r } = await instance.incrementScore(
        mockRobot,
        to,
        from,
        room,
        reason,
        1,
      );
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(expectedResult.score);
      expect(r.reasons['because points']).toBe(
        expectedResult.reasons['because points'],
      );

      const afterUser = await instance.getUser(mockRobot, to);
      expect(afterUser.score).toBe(1);
    });

    it('should add 1 point to "to.sname_underscore" with no reason and return the expected result', async () => {
      const to = 'to.sname_underscore';
      const from = { name: 'pointSender', id: '123' };
      const room = 'room';
      const reason = undefined;
      const expectedResult = { score: 1, reasons: {} };

      const beforeUser = await instance.getUser(mockRobot, to);
      expect(beforeUser.score).toBe(0);

      const { toUser: r } = await instance.incrementScore(
        mockRobot,
        to,
        from,
        room,
        reason,
        1,
      );
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(expectedResult.score);
      expect(r.reasons['because points']).toBe(
        expectedResult.reasons['because points'],
      );

      const afterUser = await instance.getUser(mockRobot, to);
      expect(afterUser.score).toBe(1);
    });

    it('should add 1 point to "name_underscore" with no reason and return the expected result', async () => {
      const to = 'name_underscore';
      const from = { name: 'pointSender', id: '123' };
      const room = 'room';
      const reason = undefined;
      const expectedResult = { score: 1, reasons: {} };

      const beforeUser = await instance.getUser(mockRobot, to);
      expect(beforeUser.score).toBe(0);

      const { toUser: r } = await instance.incrementScore(
        mockRobot,
        to,
        from,
        room,
        reason,
        1,
      );
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(expectedResult.score);
      expect(r.reasons['because points']).toBe(
        expectedResult.reasons['because points'],
      );

      const afterUser = await instance.getUser(mockRobot, to);
      expect(afterUser.score).toBe(1);
    });

    it('does not allow spamming points', async () => {
      const to = { name: 'matt.erickson.empty', id: 'matt.erickson.empty' };
      const spamUser = { name: 'matt.erickson.from', id: '123' };
      // empty score to start
      const beforeUser = await instance.getUser(mockRobot, to);
      expect(beforeUser.score).toBe(0);
      const { toUser: r } = await instance.incrementScore(
        mockRobot,
        to,
        spamUser,
        'room',
        'because points',
        1,
      );
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(1);
      expect(r.reasons['because points']).toBe(1);
      expect(mockRobot.emit).not.toHaveBeenCalled();

      // score added
      const afterUser = await instance.getUser(mockRobot, to);
      expect(afterUser.score).toBe(1);

      // Try to spam
      let r2;
      try {
        ({ toUser: r2 } = await instance.incrementScore(
          mockRobot,
          to,
          spamUser,
          'room',
          'because points',
          1,
        ));
        expect(r2).toBeUndefined();
      } catch (e) {
        expect(e.message).toBe(
          `I'm sorry <@${spamUser.id}>, I'm afraid I can't do that.`,
        );
      }
      const spamScore = await instance.getUser(mockRobot, to);
      expect(spamScore).not.toBe(2);

      expect(mockRobot.emit).toHaveBeenCalled();
      expect(mockRobot.emit).toHaveBeenCalledWith(
        'plus-plus-spam',
        expect.anything(),
      );
    });

    describe('special increment value response', () => {
      beforeAll(async () => {
        const encodedName = H.cleanAndEncode('derp');
        await db.collection('scores').insertOne({
          name: 'matt',
          score: 9,
          reasons: {},
          pointsGiven: { [encodedName]: 9 },
          slackId: '123',
        });
      });

      it('should call for a special response if user has 10 "gives"', async () => {
        const { toUser: r } = await instance.incrementScore(
          mockRobot,
          { name: 'derp' },
          { name: 'matt', id: '123' },
          'room',
          'because points',
          10,
        );
        expect(r).toBeInstanceOf(Object);
        expect(r.score).toBe(10);
        expect(r.reasons['because points']).toBe(10);
        expect(mockRobot.messageRoom).toHaveBeenCalled();
        expect(mockRobot.messageRoom).toHaveBeenCalledWith(
          '123',
          `Looks like you've given derp quite a few points, maybe you should look at submitting ${
            H.getProcessVariables(process.env).peerFeedbackUrl
          }`,
        );
      });
    });

    it('adds more points to a user for a reason', async () => {
      const to = 'to';
      let { toUser: r } = await instance.incrementScore(
        mockRobot,
        to,
        { name: 'from', id: '123' },
        'room',
        'because points',
        1,
      );
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(1);
      expect(r.reasons['because points']).toBe(1);

      ({ toUser: r } = await instance.incrementScore(
        mockRobot,
        to,
        { name: 'another-from', id: '321' },
        'room',
        'because points',
        1,
      ));
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(2);
      expect(r.reasons['because points']).toBe(2);
      expect(typeof r[`${mockRobot.name}Day`]).toBe('object');

      const afterUser = await instance.getUser(mockRobot, to);
      expect(afterUser.score).toBe(2);
    });
  });

  describe('subtracting', () => {
    it('adds points to a user', async () => {
      const { toUser: r } = await instance.incrementScore(
        mockRobot,
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        undefined,
        -1,
      );
      expect(r.score).toBe(-1);
    });

    it('subtracts points from a user for a reason', async () => {
      const { toUser: r } = await instance.incrementScore(
        mockRobot,
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        'because points',
        -1,
      );
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(-1);
      expect(r.reasons['because points']).toBe(-1);
    });

    it('does not allow spamming points', async () => {
      const to = 'mahMainBuddy';
      const spamUser = { name: 'matt.erickson.from', id: '123' };
      // empty score to start
      const beforeUser = await instance.getUser(mockRobot, to);
      expect(beforeUser.score).toBe(0);
      const { toUser: r } = await instance.incrementScore(
        mockRobot,
        to,
        spamUser,
        'room',
        'because points',
        -1,
      );
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(-1);
      expect(r.reasons['because points']).toBe(-1);
      expect(mockRobot.emit).not.toHaveBeenCalled();

      // score added
      const afterUser = await instance.getUser(mockRobot, to);
      expect(afterUser.score).toBe(-1);

      // Try to spam
      let r2;
      try {
        ({ toUser: r2 } = await instance.incrementScore(
          mockRobot,
          to,
          spamUser,
          'room',
          'because points',
          -1,
        ));
        expect(r2).toBeUndefined();
      } catch (e) {
        expect(e.message).toBe(
          `I'm sorry <@${spamUser.id}>, I'm afraid I can't do that.`,
        );
      }
      const spamScore = await instance.getUser(mockRobot, to);
      expect(spamScore).not.toBe(-2);

      expect(mockRobot.emit).toHaveBeenCalled();
      expect(mockRobot.emit).toHaveBeenCalledWith(
        'plus-plus-spam',
        expect.anything(),
      );
    });

    it('subtracts more points from a user for a reason', async () => {
      let { toUser: r } = await instance.incrementScore(
        mockRobot,
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        'because points',
        -1,
      );
      ({ toUser: r } = await instance.incrementScore(
        mockRobot,
        { name: 'to', id: 'to' },
        'another-from',
        'room',
        'because points',
        -1,
      ));
      expect(r).toBeInstanceOf(Object);
      expect(r.score).toBe(-2);
      expect(r.reasons['because points']).toBe(-2);
    });
  });

  describe('erasing', () => {
    it('erases a reason from a user', async () => {
      const { toUser: p } = await instance.incrementScore(
        mockRobot,
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        'reason',
        1,
      );
      expect(p).toBeInstanceOf(Object);
      expect(p.score).toBe(1);
      expect(p.reasons.reason).toBe(1);
      const r = await instance.erase(
        mockRobot,
        'to',
        { name: 'from', id: '123' },
        'room',
        'reason',
      );
      expect(r).toEqual(true);
      const rs = await instance.getUser(mockRobot, 'to');
      expect(rs.reasons).toEqual({ reason: 0 });
      expect(rs.reasons.reason).toBe(0);
    });

    it('erases a user from the scoreboard', async () => {
      const { toUser: p } = await instance.incrementScore(
        mockRobot,
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        'reason',
        1,
      );
      expect(p).toBeInstanceOf(Object);
      expect(p.score).toBe(1);
      expect(p.reasons.reason).toBe(1);
      const r = await instance.erase(
        mockRobot,
        'to',
        { name: 'from', id: '123' },
        'room',
      );
      expect(r).toBe(true);
      const user2 = await instance.getUser(mockRobot, 'to');
      expect(user2.score).toBe(0);
    });
  });

  describe('scores', () => {
    it('returns the score for a user', async () => {
      const { toUser: p } = await instance.incrementScore(
        mockRobot,
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        undefined,
        1,
      );
      expect(p.score).toBe(1);
      const user = await instance.getUser(mockRobot, 'to');
      expect(user.score).toBe(1);
    });

    it('returns the reasons for a user', async () => {
      try {
        const user = await instance.incrementScore(
          mockRobot,
          { name: 'to', id: 'to' },
          { name: 'from', id: '123' },
          'room',
          'because points',
          1,
        );
        expect(user.reasons).toEqual({ 'because points': 1 });
      } catch (e) {
        expect(true).not.toBe("This shouldn't be called");
      }
    });
  });
});
