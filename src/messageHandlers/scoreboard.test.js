const TestHelper = require('hubot-test-helper');

const { H } = require('../lib/helpers');
const { wait } = require('../../test/test_helpers');

describe('Scoreboard', () => {
  let room;
  let scoreboard;
  let capRobotName;
  let roomRobot;

  beforeAll(async () => {
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
    scoreboard = new TestHelper('../../../src/messageHandlers/scoreboard.js');
  });

  beforeEach(async () => {
    room = scoreboard.createRoom({ httpd: false });
    roomRobot = room.robot;
    capRobotName = H.capitalizeFirstLetter(roomRobot.name);
  });

  afterEach(async () => {
    room.destroy();
  });

  describe('getScore', () => {
    it('should respond with 5 reasons if the user has 5', async () => {
      room.user.say(
        'matt.erickson',
        `@${roomRobot.name} score for @matt.erickson`,
      );
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      const messageLines = room.messages[1][1].split('\n');
      expect(messageLines).toEqual([
        `<@matt.erickson> has 227 points.`,
        `Account Level: 1`,
        `Total Points Given: 13`,
        `:birthday: ${capRobotName}day is Jul. 9th 2020`,
        '',
        `:star: Here are some reasons :star:`,
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]);
    });

    it('should respond with 3 reasons if the user has 3', async () => {
      room.user.say(
        'matt.erickson.min',
        `@${roomRobot.name} score for @matt.erickson.min`,
      );
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      const messageLines = room.messages[1][1].split('\n');
      expect(messageLines).toEqual([
        `<@matt.erickson.min> has 8 points.`,
        `Account Level: 1`,
        `Total Points Given: -2`,
        `:birthday: ${capRobotName}day is Jul. 9th 2020`,
        '',
        `:star: Here are some reasons :star:`,
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]);
    });

    it('should respond with 3 reasons if the user has 3 and token count', async () => {
      room.user.say(
        'peter.parker.min',
        `@${roomRobot.name} score for @peter.parker.min`,
      );
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      const messageLines = room.messages[1][1].split('\n');
      expect(messageLines).toEqual([
        `<@peter.parker.min> has 8 points (*8 ${capRobotName} Tokens*).`,
        `Account Level: 2`,
        `Total Points Given: -2`,
        `:birthday: ${capRobotName}day is Jul. 9th 2020`,
        '',
        `:star: Here are some reasons :star:`,
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]);
    });
  });

  describe('respondWithLeaderLoserBoard', () => {
    it('should respond with top 2 leaders on the scoreboard', async () => {
      room.user.say('matt.erickson', `@${roomRobot.name} top 2`);
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toEqual(
        `▇▁
1. <@matt.erickson>: 227
2. <@peter.parker>: 200 (*200 ${capRobotName} Tokens*)`,
      );
    });

    it('should respond with bottom 2 losers on the scoreboard', async () => {
      room.user.say('matt.erickson', `@${roomRobot.name} bottom 2`);
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toBe(`▁▇
1. <@greg>: -10
2. <@darf>: -2`);
    });

    it('should respond with top 2 leaders on the scoreboard if account level of one user is level 2', async () => {
      room.user.say('matt.erickson', `@${roomRobot.name} top 2`);
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toContain(
        `\n1. <@matt.erickson>: 227\n2. <@peter.parker>: 200 (*200 ${capRobotName} Tokens*)`,
      );
    });
  });

  describe('respondWithLeaderLoserTokenBoard', () => {
    it('should respond with top 2 leaders on the scoreboard', async () => {
      room.user.say('matt.erickson', `@${roomRobot.name} top tokens 2`);
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toEqual(
        `▇▁
1. <@peter.parker>: *200 ${capRobotName} Tokens* (200 points)
2. <@peter.parker.min>: *8 ${capRobotName} Tokens* (8 points)`,
      );
    });

    it('should respond with bottom 2 leaders on the scoreboard', async () => {
      room.user.say('matt.erickson', `@${roomRobot.name} bottom tokens 2`);
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toContain(
        `\n1. <@peter.parker.min>: *8 ${capRobotName} Tokens* (8 points)\n2. <@peter.parker>: *200 ${capRobotName} Tokens* (200 points)`,
      );
    });
  });
});
