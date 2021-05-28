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
    warn() {},
    error() {},
  },
  name: 'testBot',
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
  this.timeout('25s');
  let scoreKeeper;
  before(async function () {
    await mongoUnit.start();
    const url = mongoUnit.getUrl();
    scoreKeeper = new ScoreKeeper({
      robot: robotStub, mongoUri: url, peerFeedbackUrl, spamMessage, furtherFeedbackSuggestedScore: 10, spamTimeLimit: 5,
    });
    return true;
  });

  beforeEach(async function () { return mongoUnit.load(defaultData); });

  afterEach(async function () { msgSpy.resetHistory(); return mongoUnit.drop(); });

  describe('adding', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    forEach([
      ['pointReceiver', { name: 'pointSender', id: '123' }, 'room', undefined, [1, 'none', {}]],
      ['pointReceiver', { name: 'pointSender', id: '123' }, 'room', 'because points', [1, 1, {}]],
      ['to.name-hyphenated', { name: 'pointSender', id: '123' }, 'room', undefined, [1, 'none', {}]],
      ['to.sname_underscore', { name: 'pointSender', id: '123' }, 'room', undefined, [1, 'none', {}]],
      ['name_underscore', { name: 'pointSender', id: '123' }, 'room', undefined, [1, 'none', {}]],
    ])
      .it('should adds points to [%1$s] with reason [%4$s] and return [%6$s]', async (to, from, room, reason, expectedResult) => {
        const beforeScore = await scoreKeeper.scoreForUser(to);
        expect(beforeScore).to.be.equal(0);
        const r = await scoreKeeper.add(to, from, room, reason);
        expect(r).to.be.an('array');
        expect(r[0]).to.equal(expectedResult[0]);
        expect(r[1]).to.equal(expectedResult[1]);
        expect(typeof r[2]).to.equal('object');
        const score = await scoreKeeper.scoreForUser(to);
        expect(score).to.be.equal(1);
      });

    it('does not allow spamming points', async function () {
      const to = 'mahMainBuddy';
      // empty score to start
      const beforeScore = await scoreKeeper.scoreForUser(to);
      expect(beforeScore).to.be.equal(0);
      const r = await scoreKeeper.add(to, { name: 'from', id: '123' }, 'room', 'because points');
      expect(r).to.be.an('array');
      expect(r[0]).to.equal(1);
      expect(r[1]).to.equal(1);
      expect(typeof r[2]).to.equal('object');

      // score added
      const afterScore = await scoreKeeper.scoreForUser(to);
      expect(afterScore).to.be.equal(1);

      // Try to spam
      const r2 = await scoreKeeper.add(to, { name: 'from', id: '123' }, 'room', 'because points');
      expect(r2).to.be.an('array');
      expect(r2[0]).to.equal(null);
      expect(r2[1]).to.equal(null);
      expect(typeof r[2]).to.equal('object');
      const spamScore = await scoreKeeper.scoreForUser(to);
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
      await db.collection('scores').insertOne({ name: 'matt', score: 9, reasons: {}, pointsGiven: { [encodedName]: 9 } });
      const r = await scoreKeeper.add('derp', { name: 'matt', id: '123' }, 'room', 'because points');
      expect(r).to.be.an('array');
      expect(r[0]).to.equal(1);
      expect(r[1]).to.equal(1);
      expect(typeof r[2]).to.equal('object');
      expect(msgSpy.called).to.equal(true);
      expect(msgSpy).to.have.been.calledWith('123', `Looks like you've given derp quite a few points, maybe you should look at submitting ${peerFeedbackUrl}`);
    });

    it('adds more points to a user for a reason', async function () {
      const to = 'to';
      let r = await scoreKeeper.add(to, { name: 'from', id: '123' }, 'room', 'because points');
      expect(r).to.be.an('array');
      expect(r[0]).to.equal(1);
      expect(r[1]).to.equal(1);
      expect(typeof r[2]).to.equal('object');
      r = await scoreKeeper.add(to, { name: 'another-from', id: '321' }, 'room', 'because points');
      expect(r).to.be.an('array');
      expect(r[0]).to.equal(2);
      expect(r[1]).to.equal(2);
      expect(typeof r[2]).to.equal('object');
      expect(typeof r[2][`${robotStub.name}Day`]).to.equal('object');
      const scoreForUser = await scoreKeeper.scoreForUser(to);
      expect(scoreForUser).to.deep.equal(2);
    });
  });

  describe('subtracting', function () {
    this.timeout('5s');
    it('adds points to a user', async function () {
      const r = await scoreKeeper.subtract('to', { name: 'from', id: '123' }, 'room');
      expect(r[0]).to.equal(-1);
    });

    it('subtracts points from a user for a reason', async function () {
      const r = await scoreKeeper.subtract('to', { name: 'from', id: '123' }, 'room', 'because points');
      this.timeout('15s');
      expect(r).to.be.an('array');
      expect(r[0]).to.equal(-1);
      expect(r[1]).to.equal(-1);
      expect(typeof r[2]).to.equal('object');
    });

    it('does not allow spamming points', async function () {
      const to = 'mahMainBuddy';
      // empty score to start
      const beforeScore = await scoreKeeper.scoreForUser(to);
      expect(beforeScore).to.be.equal(0);
      const r = await scoreKeeper.subtract(to, { name: 'from', id: '123' }, 'room', 'because points');
      expect(r).to.be.an('array');
      expect(r[0]).to.equal(-1);
      expect(r[1]).to.equal(-1);
      expect(typeof r[2]).to.equal('object');

      // score added
      const afterScore = await scoreKeeper.scoreForUser(to);
      expect(afterScore).to.be.equal(-1);

      // Try to spam
      const r2 = await scoreKeeper.subtract(to, { name: 'from', id: '123' }, 'room', 'because points');
      expect(r2).to.be.an('array');
      expect(r2[0]).to.equal(null);
      expect(r2[1]).to.equal(null);
      expect(typeof r[2]).to.equal('object');
      const spamScore = await scoreKeeper.scoreForUser(to);
      expect(spamScore).to.not.equal(-2);

      expect(msgSpy.called).to.equal(true);
      expect(msgSpy).to.have.been.calledWith('123', spamMessage);
    });

    it('subtracts more points from a user for a reason', async function () {
      let r = await scoreKeeper.subtract('to', { name: 'from', id: '123' }, 'room', 'because points');
      r = await scoreKeeper.subtract('to', 'another-from', 'room', 'because points');
      expect(r).to.be.an('array');
      expect(r[0]).to.equal(-2);
      expect(r[1]).to.equal(-2);
      expect(typeof r[2]).to.equal('object');
    });
  });

  describe('erasing', function () {
    it('erases a reason from a user', async function () {
      const p = await scoreKeeper.add('to', { name: 'from', id: '123' }, 'room', 'reason');
      expect(p).to.be.an('array');
      expect(p[0]).to.equal(1);
      expect(p[1]).to.equal(1);
      expect(typeof p[2]).to.equal('object');
      const r = await scoreKeeper.erase('to', { name: 'from', id: '123' }, 'room', 'reason');
      expect(r).to.deep.equal(true);
      const rs = scoreKeeper.reasonsForUser('to');
      expect(rs.reason).to.equal(undefined);
    });

    it('erases a user from the scoreboard', async function () {
      const p = await scoreKeeper.add('to', { name: 'from', id: '123' }, 'room', 'reason');
      expect(p).to.be.an('array');
      expect(p[0]).to.equal(1);
      expect(p[1]).to.equal(1);
      expect(typeof p[2]).to.equal('object');
      const r = await scoreKeeper.erase('to', { name: 'from', id: '123' }, 'room');
      expect(r).to.equal(true);
      const p2 = await scoreKeeper.scoreForUser('to');
      expect(p2).to.equal(0);
    });
  });

  describe('scores', function () {
    it('returns the score for a user', async function () {
      await scoreKeeper.add('to', { name: 'from', id: '123' }, 'room');
      const r = await scoreKeeper.scoreForUser('to');
      expect(r).to.equal(1);
    });

    it('returns the reasons for a user', async function () {
      await scoreKeeper.add('to', { name: 'from', id: '123' }, 'room', 'because points');
      const r = await scoreKeeper.reasonsForUser('to');
      expect(r).to.deep.equal({ 'because points': 1 });
    });
  });
});
