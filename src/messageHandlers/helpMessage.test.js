const TestHelper = require('hubot-test-helper');

const { H } = require('../lib/helpers');
const pjson = require('../../package.json');
const { wait } = require('../../test/test_helpers');

describe('helpMessage', () => {
  let room;
  let helpHelper;
  let roomRobot;
  beforeAll(async () => {
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
    helpHelper = new TestHelper('../../../src/messageHandlers/helpMessage.js');
  });

  beforeEach(() => {
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
    room = helpHelper.createRoom({ httpd: false });
    roomRobot = room.robot;
  });

  afterEach(async () => {
    room.destroy();
  });

  describe('respondWithHubotGuidance', () => {
    describe('if further URL is set', () => {
      it('should respond with hubot usage guidance and further url', async () => {
        const url = 'https://derp.com';
        room.destroy();
        process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = url;
        room = helpHelper.createRoom({ httpd: false });
        room.user.say('peter.nguyen', `@${roomRobot.name} -h`);
        await wait();
        expect(room.messages.length).toBe(2);
        expect(room.messages[1].length).toBe(2);
        const message = room.messages[1][1];
        const { blocks } = message.attachments[0];
        expect(blocks.length).toBe(4);
        expect(blocks[0]).toMatchObject({
          type: 'section',
          text: { type: 'mrkdwn', text: `Need help with ${roomRobot.name}?` },
        });
        expect(blocks[1]).toMatchObject({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '_Commands_:',
          },
        });
        expect(blocks[2]).toBeInstanceOf(Object);
        expect(blocks[3]).toMatchObject({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `For further help please visit ${url}`,
          },
        });
      });
    });

    it('should respond with hubot usage guidance', async () => {
      room.user.say('peter.nguyen', `@${roomRobot.name} help`);
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      const message = room.messages[1][1];
      const { blocks } = message.attachments[0];
      expect(blocks.length).toBe(3);
      expect(blocks[0]).toMatchObject({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Need help with ${roomRobot.name}?`,
        },
      });
      expect(blocks[1]).toMatchObject({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_Commands_:',
        },
      });
      expect(blocks[2]).toBeInstanceOf(Object);
    });
  });

  describe('version', () => {
    it('should respond with the name and version of the package when asked --version', async () => {
      await room.user.say('matt.erickson', `@${roomRobot.name} --version`);
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toBe(
        `${H.capitalizeFirstLetter(room.robot.name)} <${pjson.repository.url}|${
          pjson.name
        }> <https://www.npmjs.com/package/${pjson.name}|v${pjson.version}>.`,
      );
    });

    it('should respond with the name and version of the package when asked -v', async () => {
      await room.user.say('matt.erickson', `@${roomRobot.name} -v`);
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toBe(
        `${H.capitalizeFirstLetter(room.robot.name)} <${pjson.repository.url}|${
          pjson.name
        }> <https://www.npmjs.com/package/${pjson.name}|v${pjson.version}>.`,
      );
    });

    it('should respond with the name and version of the package when asked `plusplus version`', async () => {
      await room.user.say(
        'matt.erickson',
        `@${roomRobot.name} plusplus version`,
      );
      await wait();
      expect(room.messages.length).toBe(2);
      expect(room.messages[1].length).toBe(2);
      expect(room.messages[1][1]).toBe(
        `${H.capitalizeFirstLetter(room.robot.name)} <${pjson.repository.url}|${
          pjson.name
        }> <https://www.npmjs.com/package/${pjson.name}|v${pjson.version}>.`,
      );
    });
  });
});
