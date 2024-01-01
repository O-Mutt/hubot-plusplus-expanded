const { MongoClient } = require('mongodb');
const sinon = require('sinon');
const chai = require('chai');

const { expect } = chai;
const SlackClient = require('@slack/client');

const ScoreKeeperService = require('./scorekeeper');
const { H } = require('../helpers');
const { robotStub } = require('../../../test/test_helpers');

const defaultData = {
  scores: [{}],
  scoreLog: [{}],
};

describe('ScoreKeeper', () => {
  let msgSpy;
  let emitSpy;

  beforeEach(async () => {
    msgSpy = sinon.spy(robotStub, 'messageRoom');
    emitSpy = sinon.spy(robotStub, 'emit');
    sinon
      .stub(SlackClient, 'WebClient')
      .withArgs('token')
      .returns({
        users: {
          info: sinon
            .stub()
            .returns({ user: { profile: { email: 'test@email.com' } } }),
        },
      });
  });

  afterEach(async () => {
    sinon.restore();
    msgSpy.resetHistory();
  });

  describe('adding', () => {
    it('should add 1 point to "pointReceiver" with no reason and return the expected result', async () => {
      const to = 'pointReceiver';
      const from = { name: 'pointSender', id: '123' };
      const room = 'room';
      const reason = undefined;
      const expectedResult = { score: 1, reasons: {} };

      const beforeUser = await ScoreKeeperService.getUser(to);
      expect(beforeUser.score).to.be.equal(0);

      const { toUser: r } = await ScoreKeeperService.incrementScore(
        to,
        from,
        room,
        reason,
        1,
      );
      expect(r).to.be.an('object');
      expect(r.score).to.equal(expectedResult.score);
      expect(r.reasons['because points']).to.equal(
        expectedResult.reasons['because points'],
      );

      const afterUser = await ScoreKeeperService.getUser(to);
      expect(afterUser.score).to.be.equal(1);
    });

    it('should add 1 point to "pointReceiver" with reason "because points" and return the expected result', async () => {
      const to = 'pointReceiver';
      const from = { name: 'pointSender', id: '123' };
      const room = 'room';
      const reason = 'because points';
      const expectedResult = { score: 1, reasons: { 'because points': 1 } };

      const beforeUser = await ScoreKeeperService.getUser(to);
      expect(beforeUser.score).to.be.equal(0);

      const { toUser: r } = await ScoreKeeperService.incrementScore(
        to,
        from,
        room,
        reason,
        1,
      );
      expect(r).to.be.an('object');
      expect(r.score).to.equal(expectedResult.score);
      expect(r.reasons['because points']).to.equal(
        expectedResult.reasons['because points'],
      );

      const afterUser = await ScoreKeeperService.getUser(to);
      expect(afterUser.score).to.be.equal(1);
    });

    it('should add 1 point to "to.name-hyphenated" with no reason and return the expected result', async () => {
      const to = 'to.name-hyphenated';
      const from = { name: 'pointSender', id: '123' };
      const room = 'room';
      const reason = undefined;
      const expectedResult = { score: 1, reasons: {} };

      const beforeUser = await ScoreKeeperService.getUser(to);
      expect(beforeUser.score).to.be.equal(0);

      const { toUser: r } = await ScoreKeeperService.incrementScore(
        to,
        from,
        room,
        reason,
        1,
      );
      expect(r).to.be.an('object');
      expect(r.score).to.equal(expectedResult.score);
      expect(r.reasons['because points']).to.equal(
        expectedResult.reasons['because points'],
      );

      const afterUser = await ScoreKeeperService.getUser(to);
      expect(afterUser.score).to.be.equal(1);
    });

    it('should add 1 point to "to.sname_underscore" with no reason and return the expected result', async () => {
      const to = 'to.sname_underscore';
      const from = { name: 'pointSender', id: '123' };
      const room = 'room';
      const reason = undefined;
      const expectedResult = { score: 1, reasons: {} };

      const beforeUser = await ScoreKeeperService.getUser(to);
      expect(beforeUser.score).to.be.equal(0);

      const { toUser: r } = await ScoreKeeperService.incrementScore(
        to,
        from,
        room,
        reason,
        1,
      );
      expect(r).to.be.an('object');
      expect(r.score).to.equal(expectedResult.score);
      expect(r.reasons['because points']).to.equal(
        expectedResult.reasons['because points'],
      );

      const afterUser = await ScoreKeeperService.getUser(to);
      expect(afterUser.score).to.be.equal(1);
    });

    it('should add 1 point to "name_underscore" with no reason and return the expected result', async () => {
      const to = 'name_underscore';
      const from = { name: 'pointSender', id: '123' };
      const room = 'room';
      const reason = undefined;
      const expectedResult = { score: 1, reasons: {} };

      const beforeUser = await ScoreKeeperService.getUser(to);
      expect(beforeUser.score).to.be.equal(0);

      const { toUser: r } = await ScoreKeeperService.incrementScore(
        to,
        from,
        room,
        reason,
        1,
      );
      expect(r).to.be.an('object');
      expect(r.score).to.equal(expectedResult.score);
      expect(r.reasons['because points']).to.equal(
        expectedResult.reasons['because points'],
      );

      const afterUser = await ScoreKeeperService.getUser(to);
      expect(afterUser.score).to.be.equal(1);
    });

    it('does not allow spamming points', async () => {
      const to = { name: 'matt.erickson', id: 'matt.erickson' };
      // empty score to start
      const beforeUser = await ScoreKeeperService.getUser(to);
      expect(beforeUser.score).to.be.equal(0);
      const { toUser: r } = await ScoreKeeperService.incrementScore(
        to,
        { name: 'matt.erickson.min', id: '123' },
        'room',
        'because points',
        1,
      );
      expect(r).to.be.an('object');
      expect(r.score).to.equal(1);
      expect(r.reasons['because points']).to.equal(1);
      expect(emitSpy.called).to.equal(false);

      // score added
      const afterUser = await ScoreKeeperService.getUser(to);
      expect(afterUser.score).to.be.equal(1);

      // Try to spam
      let r2;
      try {
        ({ toUser: r2 } = await ScoreKeeperService.incrementScore(
          to,
          { name: 'from', id: '123' },
          'room',
          'because points',
          1,
        ));
        expect(r2).to.be.an('undefined');
      } catch (e) {
        expect(e.message).to.equal(
          "I'm sorry <@123>, I'm afraid I can't do that.",
        );
      }
      const spamScore = await ScoreKeeperService.getUser(to);
      expect(spamScore).to.not.equal(2);

      expect(emitSpy.called).to.equal(true);
      expect(emitSpy).to.have.been.calledWith('plus-plus-spam');
    });

    describe('special increment value response', () => {
      before(async () => {
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
        const { toUser: r } = await ScoreKeeperService.incrementScore(
          { name: 'derp' },
          { name: 'matt', id: '123' },
          'room',
          'because points',
          1,
        );
        expect(r).to.be.an('object');
        expect(r.score).to.equal(1);
        expect(r.reasons['because points']).to.equal(1);
        expect(msgSpy.called).to.equal(true);
        expect(msgSpy).to.have.been.calledWith(
          '123',
          `Looks like you've given derp quite a few points, maybe you should look at submitting ${ScoreKeeperService.peerFeedbackUrl}`,
        );
      });
    });

    it('adds more points to a user for a reason', async () => {
      const to = 'to';
      let { toUser: r } = await ScoreKeeperService.incrementScore(
        to,
        { name: 'from', id: '123' },
        'room',
        'because points',
        1,
      );
      expect(r).to.be.an('object');
      expect(r.score).to.equal(1);
      expect(r.reasons['because points']).to.equal(1);

      ({ toUser: r } = await ScoreKeeperService.incrementScore(
        to,
        { name: 'another-from', id: '321' },
        'room',
        'because points',
        1,
      ));
      expect(r).to.be.an('object');
      expect(r.score).to.equal(2);
      expect(r.reasons['because points']).to.equal(2);
      expect(typeof r[`${robotStub.name}Day`]).to.equal('object');

      const afterUser = await ScoreKeeperService.getUser(to);
      expect(afterUser.score).to.equal(2);
    });
  });

  describe('subtracting', () => {
    it('adds points to a user', async () => {
      const { toUser: r } = await ScoreKeeperService.incrementScore(
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        undefined,
        -1,
      );
      expect(r.score).to.equal(-1);
    });

    it('subtracts points from a user for a reason', async () => {
      const { toUser: r } = await ScoreKeeperService.incrementScore(
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        'because points',
        -1,
      );
      expect(r).to.be.an('object');
      expect(r.score).to.equal(-1);
      expect(r.reasons['because points']).to.equal(-1);
    });

    it('does not allow spamming points', async () => {
      const to = 'mahMainBuddy';
      // empty score to start
      const beforeUser = await ScoreKeeperService.getUser(to);
      expect(beforeUser.score).to.be.equal(0);
      const { toUser: r } = await ScoreKeeperService.incrementScore(
        to,
        { name: 'from', id: '123' },
        'room',
        'because points',
        -1,
      );
      expect(r).to.be.an('object');
      expect(r.score).to.equal(-1);
      expect(r.reasons['because points']).to.equal(-1);

      // score added
      const afterUser = await ScoreKeeperService.getUser(to);
      expect(afterUser.score).to.be.equal(-1);

      // Try to spam
      let r2;
      try {
        ({ toUser: r2 } = await ScoreKeeperService.incrementScore(
          to,
          { name: 'from', id: '123' },
          'room',
          'because points',
          -1,
        ));
        expect(r2).to.be.an('undefined');
      } catch (e) {
        expect(e.message).to.equal(
          "I'm sorry <@123>, I'm afraid I can't do that.",
        );
      }
      const spamScore = await ScoreKeeperService.getUser(to);
      expect(spamScore).to.not.equal(-2);

      expect(emitSpy.called).to.equal(true);
      expect(emitSpy).to.have.been.calledWith('plus-plus-spam');
    });

    it('subtracts more points from a user for a reason', async () => {
      let { toUser: r } = await ScoreKeeperService.incrementScore(
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        'because points',
        -1,
      );
      ({ toUser: r } = await ScoreKeeperService.incrementScore(
        { name: 'to', id: 'to' },
        'another-from',
        'room',
        'because points',
        -1,
      ));
      expect(r).to.be.an('object');
      expect(r.score).to.equal(-2);
      expect(r.reasons['because points']).to.equal(-2);
    });
  });

  describe('erasing', () => {
    it('erases a reason from a user', async () => {
      const { toUser: p } = await ScoreKeeperService.incrementScore(
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        'reason',
        1,
      );
      expect(p).to.be.an('object');
      expect(p.score).to.equal(1);
      expect(p.reasons.reason).to.equal(1);
      const r = await ScoreKeeperService.erase(
        'to',
        { name: 'from', id: '123' },
        'room',
        'reason',
      );
      expect(r).to.deep.equal(true);
      const rs = await ScoreKeeperService.getUser('to');
      expect(rs.reasons).to.deep.equal({ reason: 0 });
      expect(rs.reasons.reason).to.equal(0);
    });

    it('erases a user from the scoreboard', async () => {
      const { toUser: p } = await ScoreKeeperService.incrementScore(
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        'reason',
        1,
      );
      expect(p).to.be.an('object');
      expect(p.score).to.equal(1);
      expect(p.reasons.reason).to.equal(1);
      const r = await ScoreKeeperService.erase(
        'to',
        { name: 'from', id: '123' },
        'room',
      );
      expect(r).to.equal(true);
      const user2 = await ScoreKeeperService.getUser('to');
      expect(user2.score).to.equal(0);
    });
  });

  describe('scores', () => {
    it('returns the score for a user', async () => {
      const { toUser: p } = await ScoreKeeperService.incrementScore(
        { name: 'to', id: 'to' },
        { name: 'from', id: '123' },
        'room',
        undefined,
        1,
      );
      expect(p.score).to.equal(1);
      const user = await ScoreKeeperService.getUser('to');
      expect(user.score).to.equal(1);
    });

    it('returns the reasons for a user', async () => {
      try {
        const user = await ScoreKeeperService.incrementScore(
          { name: 'to', id: 'to' },
          { name: 'from', id: '123' },
          'room',
          'because points',
          1,
        );
        expect(user.reasons).to.deep.equal({ 'because points': 1 });
      } catch (e) {
        expect(true).to.not.equal("This shouldn't be called");
      }
    });
  });
});
