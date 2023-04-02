const chai = require('chai');
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const TestHelper = require('hubot-test-helper');

const { expect } = chai;

const Helpers = require('./lib/Helpers');
const pjson = require('../package.json');
const { wait } = require('../test/test_helpers');

describe('help', () => {
  let room;
  let helpHelper;
  before(async () => {
    process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = undefined;
    helpHelper = new TestHelper('./help.js');
  });

  beforeEach(() => {
    room = helpHelper.createRoom();
  });

  after(async () => {
    sinon.restore();
  });

  afterEach(async () => {
    sinon.restore();
    room.destroy();
  });

  describe('respondWithHubotGuidance', () => {
    it('should respond with hubot usage guidance', async () => {
      room.user.say('peter.nguyen', '@hubot help');
      await wait(55);
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1].length).to.equal(2);
      const message = room.messages[1][1];
      const { blocks } = message.attachments[0];
      expect(blocks.length).to.equal(3);
      expect(blocks[0]).to.deep.include({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Need help with hubot?',
        },
      });
      expect(blocks[1]).to.deep.include({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_Commands_:',
        },
      });
      expect(blocks[2]).to.be.an('object');
    });

    it('should respond with hubot usage guidance and further URL if env var is set', async () => {
      const url = 'https://derp.com';
      room.destroy();
      process.env.HUBOT_CRYPTO_FURTHER_HELP_URL = url;
      room = helpHelper.createRoom();
      room.user.say('peter.nguyen', '@hubot -h');
      await wait(55);
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1].length).to.equal(2);
      const message = room.messages[1][1];
      const { blocks } = message.attachments[0];
      expect(blocks.length).to.equal(4);
      expect(blocks[0]).to.deep.include({
        type: 'section',
        text: { type: 'mrkdwn', text: 'Need help with hubot?' },
      });
      expect(blocks[1]).to.deep.include({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_Commands_:',
        },
      });
      expect(blocks[2]).to.be.an('object');
      expect(blocks[3]).to.deep.include({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `For further help please visit ${url}`,
        },
      });
    });
  });

  describe('version', () => {
    it('should respond with the name and version of the package when asked --version', async () => {
      await room.user.say('matt.erickson', '@hubot --version');
      await wait(55);
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1].length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        `${Helpers.capitalizeFirstLetter(room.robot.name)} [${pjson.name}](${pjson.repository.url}): [v${pjson.version}](https://www.npmjs.com/package/${pjson.name}).`,
      );
    });

    it('should respond with the name and version of the package when asked -v', async () => {
      await room.user.say('matt.erickson', '@hubot -v');
      await wait(55);
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1].length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        `${Helpers.capitalizeFirstLetter(room.robot.name)} [${pjson.name}](${pjson.repository.url}): [v${pjson.version}](https://www.npmjs.com/package/${pjson.name}).`,
      );
    });

    it('should respond with the name and version of the package when asked `plusplus version`', async () => {
      await room.user.say('matt.erickson', '@hubot plusplus version');
      await wait(55);
      expect(room.messages.length).to.equal(2);
      expect(room.messages[1].length).to.equal(2);
      expect(room.messages[1][1]).to.equal(
        `${Helpers.capitalizeFirstLetter(room.robot.name)} [${pjson.name}](${pjson.repository.url}): [v${pjson.version}](https://www.npmjs.com/package/${pjson.name}).`,
      );
    });
  });
});
