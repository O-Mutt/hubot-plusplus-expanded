const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const forEach = require('mocha-each');

const { expect } = chai;

const { MongoClient } = require('mongodb');
const mongoUnit = require('mongo-unit');

const helpers = require('../src/helpers');
const ScoreKeeper = require('../src/scorekeeper.js');

const peerFeedbackUrl = '\'Small Improvements\' (company.small-improvements.com)';
const spamMessage = 'Please slow your roll.';
const robotStub = {
  brain: {
    data: { },
    on() {},
    emit() {},
    save() {},
  },
  logger: {
    debug() {},
    info() {},
    error() {},
  },
  name: 'hubot',
  messageRoom: (message) => message,
};
const defaultData = {
  scores: [
    {},
  ],
  scoreLog: [
    {},
  ],
};
const msgSpy = sinon.spy(robotStub, 'messageRoom');

describe('ScoreKeeper', function scorekeeperTest() {
  let scoreKeeper;
  before(async function () {
    await mongoUnit.start();
    const url = mongoUnit.getUrl();
    scoreKeeper = new ScoreKeeper({
      robot: robotStub, mongoUri: url, peerFeedbackUrl, spamMessage, furtherFeedbackSuggestedScore: 10, spamTimeLimit: 1,
    });
    return true;
  });

  beforeEach(async function () { return mongoUnit.load(defaultData); });

  afterEach(async function () { msgSpy.resetHistory(); return mongoUnit.drop(); });

  describe('adding', function () {
    forEach([
      ['pointReceiver', { name: 'pointSender', id: '123' }, 'room', undefined, { score: 1, reasons: { } }],
      ['pointReceiver', { name: 'pointSender', id: '123' }, 'room', 'because points', { score: 1, reasons: { 'because points': 1 } }],
      ['to.name-hyphenated', { name: 'pointSender', id: '123' }, 'room', undefined, { score: 1, reasons: {} }],
      ['to.sname_underscore', { name: 'pointSender', id: '123' }, 'room', undefined, { score: 1, reasons: {} }],
      ['name_underscore', { name: 'pointSender', id: '123' }, 'room', undefined, { score: 1, reasons: {} }],
    ])
      .it('should adds points to [%1$s] with reason [%4$s] and return [%6$s]', async (to, from, room, reason, expectedResult) => {
        const beforeUser = await scoreKeeper.getUser(to);
        expect(beforeUser.score).to.be.equal(0);
        const r = await scoreKeeper.incrementScore(to, from, room, reason, 1);
        expect(r).to.be.an('object');
        expect(r.score).to.equal(expectedResult.score);
        expect(r.reasons['because points']).to.equal(expectedResult.reasons['because points']);

        const afterUser = await scoreKeeper.getUser(to);
        expect(afterUser.score).to.be.equal(1);
      });

    it('does not allow spamming points', async function () {
      const to = { name: 'mahMainBuddy', id: 'mahMainBuddy' };
      // empty score to start
      const beforeUser = await scoreKeeper.getUser(to);
      expect(beforeUser.score).to.be.equal(0);
      const r = await scoreKeeper.incrementScore(to, { name: 'from', id: '123' }, 'room', 'because points', 1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(1);
      expect(r.reasons['because points']).to.equal(1);

      // score added
      const afterUser = await scoreKeeper.getUser(to);
      expect(afterUser.score).to.be.equal(1);

      // Try to spam
      let r2;
      try {
        r2 = await scoreKeeper.incrementScore(to, { name: 'from', id: '123' }, 'room', 'because points', 1);
        expect(r2).to.be.an('undefined');
      } catch (e) {
        expect(e.message).to.equal("I'm sorry from, I'm afraid I can't do that.");
      }
      const spamScore = await scoreKeeper.getUser(to);
      expect(spamScore).to.not.equal(2);

      expect(msgSpy.called).to.equal(true);
      expect(msgSpy).to.have.been.calledWith('123', spamMessage);
    });

    it('should call for a special response if user has 10 "gives"', async function () {
      const url = await mongoUnit.start();
      const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
      const connection = await client.connect();
      const db = connection.db();
      const encodedName = helpers.cleanAndEncode('derp');
      await db.collection('scores').insertOne({ name: 'matt', score: 9, reasons: {}, pointsGiven: { [encodedName]: 9 }, slackId: '123' });
      const r = await scoreKeeper.incrementScore({ name: 'derp' }, { name: 'matt', id: '123' }, 'room', 'because points', 1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(1);
      expect(r.reasons['because points']).to.equal(1);
      expect(msgSpy.called).to.equal(true);
      expect(msgSpy).to.have.been.calledWith('123', `Looks like you've given derp quite a few points, maybe you should look at submitting ${peerFeedbackUrl}`);
    });

    it('adds more points to a user for a reason', async function () {
      const to = 'to';
      let r = await scoreKeeper.incrementScore(to, { name: 'from', id: '123' }, 'room', 'because points', 1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(1);
      expect(r.reasons['because points']).to.equal(1);

      r = await scoreKeeper.incrementScore(to, { name: 'another-from', id: '321' }, 'room', 'because points', 1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(2);
      expect(r.reasons['because points']).to.equal(2);
      expect(typeof r[`${robotStub.name}Day`]).to.equal('object');

      const afterUser = await scoreKeeper.getUser(to);
      expect(afterUser.score).to.equal(2);
    });
  });

  describe('subtracting', function () {
    it('adds points to a user', async function () {
      const r = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', undefined, -1);
      expect(r.score).to.equal(-1);
    });

    it('subtracts points from a user for a reason', async function () {
      const r = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', 'because points', -1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(-1);
      expect(r.reasons['because points']).to.equal(-1);
    });

    it('does not allow spamming points', async function () {
      const to = 'mahMainBuddy';
      // empty score to start
      const beforeUser = await scoreKeeper.getUser(to);
      expect(beforeUser.score).to.be.equal(0);
      const r = await scoreKeeper.incrementScore(to, { name: 'from', id: '123' }, 'room', 'because points', -1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(-1);
      expect(r.reasons['because points']).to.equal(-1);

      // score added
      const afterUser = await scoreKeeper.getUser(to);
      expect(afterUser.score).to.be.equal(-1);

      // Try to spam
      let r2;
      try {
        r2 = await scoreKeeper.incrementScore(to, { name: 'from', id: '123' }, 'room', 'because points', -1);
        expect(r2).to.be.an('undefined');
      } catch (e) {
        expect(e.message).to.equal("I'm sorry from, I'm afraid I can't do that.");
      }
      const spamScore = await scoreKeeper.getUser(to);
      expect(spamScore).to.not.equal(-2);

      expect(msgSpy.called).to.equal(true);
      expect(msgSpy).to.have.been.calledWith('123', spamMessage);
    });

    it('subtracts more points from a user for a reason', async function () {
      let r = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', 'because points', -1);
      r = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, 'another-from', 'room', 'because points', -1);
      expect(r).to.be.an('object');
      expect(r.score).to.equal(-2);
      expect(r.reasons['because points']).to.equal(-2);
    });
  });

  describe('erasing', function () {
    it('erases a reason from a user', async function () {
      const p = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', 'reason', 1);
      expect(p).to.be.an('object');
      expect(p.score).to.equal(1);
      expect(p.reasons.reason).to.equal(1);
      const r = await scoreKeeper.erase('to', { name: 'from', id: '123' }, 'room', 'reason');
      expect(r).to.deep.equal(true);
      const rs = await scoreKeeper.getUser('to');
      expect(rs.reasons).to.deep.equal({ reason: 0 });
      expect(rs.reasons.reason).to.equal(0);
    });

    it('erases a user from the scoreboard', async function () {
      const p = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', 'reason', 1);
      expect(p).to.be.an('object');
      expect(p.score).to.equal(1);
      expect(p.reasons.reason).to.equal(1);
      const r = await scoreKeeper.erase('to', { name: 'from', id: '123' }, 'room');
      expect(r).to.equal(true);
      const user2 = await scoreKeeper.getUser('to');
      expect(user2.score).to.equal(0);
    });
  });

  describe('scores', function () {
    it('returns the score for a user', async function () {
      await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', undefined, 1);
      const user = await scoreKeeper.getUser('to');
      expect(user.score).to.equal(1);
    });

    it('returns the reasons for a user', async function () {
      try {
        const user = await scoreKeeper.incrementScore({ name: 'to', id: 'to' }, { name: 'from', id: '123' }, 'room', 'because points', 1);
        expect(user.reasons).to.deep.equal({ 'because points': 1 });
      } catch (e) {
        expect(true).to.not.equal("This shouldn't be called");
      }
    });
  });
});
