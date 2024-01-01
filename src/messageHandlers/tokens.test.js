const sinon = require('sinon');

const TestHelper = require('hubot-test-helper');
const SlackClient = require('@slack/client');

const { H } = require('../lib/helpers');
const { wait } = require('../../test/test_helpers');

describe('Tokens', () => {
  let room;
  let tokenHelper;
  beforeAll(async () => {
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;

    tokenHelper = new TestHelper('./messageHandlers/tokens.js');
  });

  afterAll(async () => {
    sinon.restore();
  });

  beforeEach(async () => {
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

    sinon.stub(H, 'isA1Day').returns(false);
    room = tokenHelper.createRoom({ httpd: false });
  });

  afterEach(async () => {
    sinon.restore();
    room.destroy();
  });

  describe('giveTokenBetweenUsers', () => {
    it("should add a X points when a user is + #'d", async () => {
      room.user.say('peter.parker', '@hubot @peter.parker.min + 5');
      await wait(55);
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toBe('<@peter.parker> transferred *5* hubot Tokens to <@peter.parker.min>.' +
        '\n<@peter.parker.min> now has 13 tokens.' +
        '\n_<@peter.parker> has 195 tokens_');
      const to = await db
        .collection('scores')
        .findOne({ name: 'peter.parker.min' });
      expect(to.score).toBe(8);
      expect(to.token).toBe(13);
      const from = await db
        .collection('scores')
        .findOne({ name: 'peter.parker' });
      expect(from.score).toBe(200);
      expect(from.token).toBe(195);
    });

    it('should error and message if sender is short on tokens', async () => {
      room.user.say('peter.parker.min', '@hubot @peter.parker + 55');
      await wait(55);
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toMatch(/You don't have enough tokens to send 55 to peter.parker/);
      const to = await db
        .collection('scores')
        .findOne({ name: 'peter.parker' });
      expect(to.score).toBe(200);
      expect(to.token).toBe(200);
      const from = await db
        .collection('scores')
        .findOne({ name: 'peter.parker.min' });
      expect(from.score).toBe(8);
      expect(from.token).toBe(8);
    });

    it('should error and message if sender is not level 2', async () => {
      room.user.say('matt.erickson.min', '@hubot @peter.parker + 55');
      await wait(55);
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toBe(
        'In order to send tokens to peter.parker you both must be, at least, level 2.'
      );
      const to = await db
        .collection('scores')
        .findOne({ name: 'peter.parker' });
      expect(to.score).toBe(200);
      expect(to.token).toBe(200);
      const from = await db
        .collection('scores')
        .findOne({ name: 'matt.erickson.min' });
      expect(from.score).toBe(8);
      expect(from.token).toBeUndefined();
    });

    it('should error and message if recipient is not level 2', async () => {
      room.user.say('peter.parker', '@hubot @matt.erickson + 55');
      await wait(55);
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toBe(
        'In order to send tokens to matt.erickson you both must be, at least, level 2.'
      );
      const to = await db
        .collection('scores')
        .findOne({ name: 'matt.erickson' });
      expect(to.score).toBe(227);
      expect(to.token).toBeUndefined();
      const from = await db
        .collection('scores')
        .findOne({ name: 'peter.parker' });
      expect(from.score).toBe(200);
      expect(from.token).toBe(200);
    });

    it('should error on second point (for spam check)', async () => {
      room.user.say('peter.parker', '@hubot @peter.parker.min + 2');
      await wait(55);
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toBe('<@peter.parker> transferred *2* hubot Tokens to <@peter.parker.min>.' +
        '\n<@peter.parker.min> now has 10 tokens.' +
        '\n_<@peter.parker> has 198 tokens_');
      const to = await db
        .collection('scores')
        .findOne({ name: 'peter.parker.min' });
      expect(to.score).toBe(8);
      expect(to.token).toBe(10);
      const from = await db
        .collection('scores')
        .findOne({ name: 'peter.parker' });
      expect(from.score).toBe(200);
      expect(from.token).toBe(198);
      room.user.say('peter.parker', '@hubot @peter.parker.min + 2');
      await wait(55);
      const spamCheck = await db
        .collection('scoreLog')
        .findOne({ from: 'peter.parker' });
      expect(Object.keys(spamCheck)).toEqual([
        '_id',
        'from',
        'to',
        'date',
        'room',
        'reason',
        'scoreChange',
      ]);
      spamCheck.date = '123'; // hack to handle date;
      spamCheck._id = '1';
      expect(spamCheck).toMatchObject({
        from: 'peter.parker',
        to: 'peter.parker.min',
        reason: null,
        room: room.name,
        scoreChange: 2,
        _id: '1',
        date: '123',
      });
      expect(room.messages[3][1]).toBe("I'm sorry <@peter.parker>, I'm afraid I can't do that.");
    });
  });
});
