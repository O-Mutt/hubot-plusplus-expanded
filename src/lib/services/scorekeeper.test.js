const chai = require('chai');
const sinon = require('sinon');
const forEach = require('mocha-each');

const { expect } = chai;

const { MongoClient } = require('mongodb');
const SlackClient = require('@slack/client');
const mongoUnit = require('mongo-unit');

const Helpers = require('../Helpers');
const ScoreKeeper = require('./scorekeeper');
const { robotStub, mockScoreKeeper } = require('../../../test/test_helpers');



const defaultData = {
  scores: [
    {},
  ],
  scoreLog: [
    {},
  ],
};

describe('ScoreKeeper', () => {
  let scoreKeeper;
  let msgSpy;
  let emitSpy;
  before(async () => {
    await mongoUnit.start();
    const url = mongoUnit.getUrl();
    scoreKeeper = mockScoreKeeper(url);

    return true;
  });

  beforeEach(async () => {
    msgSpy = sinon.spy(robotStub, 'messageRoom');
    emitSpy = sinon.spy(robotStub, 'emit');
    sinon.stub(SlackClient, 'WebClient').withArgs('token').returns({
      users: {
        info: sinon.stub().returns({ user: { profile: { email: 'test@email.com' } } }),
      },
    });
    return mongoUnit.load(defaultData);
  });

  afterEach(async () => {
    sinon.restore();
    msgSpy.resetHistory();
    return mongoUnit.drop();
  });

  describe('adding', () => {
    const testCases = [];
    before(() => {
      testCases.push([
        ['pointReceiver', { name: 'pointSender', id: '123' }, 'room', undefined, { score: 1, reasons: { } }],
        ['pointReceiver', { name: 'pointSender', id: '123' }, 'room', 'because points', { score: 1, reasons: { 'because points': 1 } }],
        ['to.name-hyphenated', { name: 'pointSender', id: '123' }, 'room', undefined, { score: 1, reasons: {} }],
        ['to.sname_underscore', { name: 'pointSender', id: '123' }, 'room', undefined, { score: 1, reasons: {} }],
        ['name_underscore', { name: 'pointSender', id: '123' }, 'room', undefined, { score: 1, reasons: {} }],
      ]);
    });

    forEach(testCases, ('should adds points to [%1$s] with reason [%4$s] and return [%6$s]', async (to, from, room, reason, expectedResult) => {
      const beforeUser = await scoreKeeper.getUser(to);
      expect(beforeUser.score).to.be.equal(0);
      const { toUser: r } = await scoreKeeper.incrementScore(to, from, room, reason, 1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(expectedResult.score);
      expect(r.reasons['because points']).to.equal(expectedResult.reasons['because points']);

      const afterUser = await scoreKeeper.getUser(to);
      expect(afterUser.score).to.be.equal(1);
    }));

    it('does not allow spamming points', async () => {
      const to = { name: 'matt.erickson', id: 'matt.erickson' };
      // empty score to start
      const beforeUser = await scoreKeeper.getUser(to);
      expect(beforeUser.score).to.be.equal(0);
      const { toUser: r } = await scoreKeeper.incrementScore(to, { name: 'matt.erickson.min', id: '123' }, 'room', 'because points', 1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(1);
      expect(r.reasons['because points']).to.equal(1);
      expect(emitSpy.called).to.equal(false);

      // score added
      const afterUser = await scoreKeeper.getUser(to);
      expect(afterUser.score).to.be.equal(1);

      // Try to spam
      let r2;
      try {
        ({ toUser: r2 } = await scoreKeeper.incrementScore(to, { name: 'from', id: '123' }, 'room', 'because points', 1));
        expect(r2).to.be.an('undefined');
      } catch (e) {
        expect(e.message).to.equal("I'm sorry <@123>, I'm afraid I can't do that.");
      }
      const spamScore = await scoreKeeper.getUser(to);
      expect(spamScore).to.not.equal(2);

      expect(emitSpy.called).to.equal(true);

      const { args } = emitSpy.getCall(0);
      expect(args[0]).to.equal('plus-plus-spam');
    });

    describe('special increment value response', () => {
      before(async () => {
        const url = await mongoUnit.start();
        const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const connection = await client.connect();
        const db = connection.db();
        const encodedName = Helpers.cleanAndEncode('derp');
        await db.collection('scores').insertOne({
          name: 'matt',
          score: 9,
          reasons: {},
          pointsGiven: { [encodedName]: 9 },
          slackId: '123',
        });
      });

      it('should call for a special response if user has 10 "gives"', async () => {
        const { toUser: r } = await scoreKeeper.incrementScore({ name: 'derp' }, { name: 'matt', id: '123' }, 'room', 'because points', 1);
        expect(r).to.be.an('object');
        expect(r.score).to.equal(1);
        expect(r.reasons['because points']).to.equal(1);
        expect(msgSpy.called).to.equal(true);
        const { args } = msgSpy.getCall(0);
        expect(args.length).to.equal(2);
        expect(args[0]).to.equal('123');
        expect(args[1]).to.equal(`Looks like you've given derp quite a few points, maybe you should look at submitting ${scoreKeeper.peerFeedbackUrl}`);
      });
    });

    it('adds more points to a user for a reason', async () => {
      const to = 'to';
      let { toUser: r } = await scoreKeeper.incrementScore(to, { name: 'from', id: '123' }, 'room', 'because points', 1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(1);
      expect(r.reasons['because points']).to.equal(1);

      ({ toUser: r } = await scoreKeeper.incrementScore(to, { name: 'another-from', id: '321' }, 'room', 'because points', 1));
      expect(r).to.be.an('object');
      expect(r.score).to.equal(2);
      expect(r.reasons['because points']).to.equal(2);
      expect(typeof r[`${robotStub.name}Day`]).to.equal('object');

      const afterUser = await scoreKeeper.getUser(to);
      expect(afterUser.score).to.equal(2);
    });
  });

  describe('subtracting', () => {
    it('adds points to a user', async () => {
      const { toUser: r } = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', undefined, -1);
      expect(r.score).to.equal(-1);
    });

    it('subtracts points from a user for a reason', async () => {
      const { toUser: r } = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', 'because points', -1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(-1);
      expect(r.reasons['because points']).to.equal(-1);
    });

    it('does not allow spamming points', async () => {
      const to = 'mahMainBuddy';
      // empty score to start
      const beforeUser = await scoreKeeper.getUser(to);
      expect(beforeUser.score).to.be.equal(0);
      const { toUser: r } = await scoreKeeper.incrementScore(to, { name: 'from', id: '123' }, 'room', 'because points', -1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(-1);
      expect(r.reasons['because points']).to.equal(-1);

      // score added
      const afterUser = await scoreKeeper.getUser(to);
      expect(afterUser.score).to.be.equal(-1);

      // Try to spam
      let r2;
      try {
        ({ toUser: r2 } = await scoreKeeper.incrementScore(to, { name: 'from', id: '123' }, 'room', 'because points', -1));
        expect(r2).to.be.an('undefined');
      } catch (e) {
        expect(e.message).to.equal("I'm sorry <@123>, I'm afraid I can't do that.");
      }
      const spamScore = await scoreKeeper.getUser(to);
      expect(spamScore).to.not.equal(-2);

      expect(emitSpy.called).to.equal(true);
      const { args } = emitSpy.getCall(0);
      expect(args[0]).to.equal('plus-plus-spam');
    });

    it('subtracts more points from a user for a reason', async () => {
      let { toUser: r } = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', 'because points', -1);
      ({ toUser: r } = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, 'another-from', 'room', 'because points', -1));
      expect(r).to.be.an('object');
      expect(r.score).to.equal(-2);
      expect(r.reasons['because points']).to.equal(-2);
    });
  });

  describe('erasing', () => {
    it('erases a reason from a user', async () => {
      const { toUser: p } = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', 'reason', 1);
      expect(p).to.be.an('object');
      expect(p.score).to.equal(1);
      expect(p.reasons.reason).to.equal(1);
      const r = await scoreKeeper.erase('to', { name: 'from', id: '123' }, 'room', 'reason');
      expect(r).to.deep.equal(true);
      const rs = await scoreKeeper.getUser('to');
      expect(rs.reasons).to.deep.equal({ reason: 0 });
      expect(rs.reasons.reason).to.equal(0);
    });

    it('erases a user from the scoreboard', async () => {
      const { toUser: p } = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', 'reason', 1);
      expect(p).to.be.an('object');
      expect(p.score).to.equal(1);
      expect(p.reasons.reason).to.equal(1);
      const r = await scoreKeeper.erase('to', { name: 'from', id: '123' }, 'room');
      expect(r).to.equal(true);
      const user2 = await scoreKeeper.getUser('to');
      expect(user2.score).to.equal(0);
    });
  });

  describe('scores', () => {
    it('returns the score for a user', async () => {
      const { toUser: p } = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', undefined, 1);
      expect(p.score).to.equal(1);
      const user = await scoreKeeper.getUser('to');
      expect(user.score).to.equal(1);
    });

    it('returns the reasons for a user', async () => {
      try {
        const user = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', 'because points', 1);
        expect(user.reasons).to.deep.equal({ 'because points': 1 });
      } catch (e) {
        expect(true).to.not.equal("This shouldn't be called");
      }
    });
  });
});
