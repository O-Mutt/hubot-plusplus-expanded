const TestHelper = require('hubot-test-helper');

const { relativeTestHelperPathHelper } = require('../test/test_helpers');

describe('EventHandlers', () => {
  let room;
  let tokenHelper;
  let roomRobot;
  let msgSpy;
  beforeAll(async () => {
    process.env.HUBOT_PLUSPLUS_NOTIFICATION_ROOM = undefined;

    tokenHelper = new TestHelper(
      relativeTestHelperPathHelper('src/eventHandlers.js'),
    );
  });

  afterAll(async () => {});

  beforeEach(async () => {
    room = await tokenHelper.createRoom({ httpd: false });
    roomRobot = room.robot;
    msgSpy = jest.spyOn(roomRobot, 'messageRoom');
  });

  afterEach(async () => {
    room.destroy();
  });

  describe('plus-plus event', () => {
    describe('when the HUBOT_PLUSPLUS_NOTIFICATION_ROOM is undefined', () => {
      it(`shouldn't do anything`, async () => {
        room.emit('plus-plus', [{}]);
        expect(room.messages.length).toBe(0);
        expect(msgSpy).not.toHaveBeenCalled();
      });
    });

    describe('when the HUBOT_PLUSPLUS_NOTIFICATION_ROOM is defined', () => {
      it('should message room with empty message if empty object in array', async () => {
        process.env.HUBOT_PLUSPLUS_NOTIFICATION_ROOM = 'test';
        roomRobot.emit('plus-plus', [{}]);
        expect(room.messages.length).toBe(0);
        expect(msgSpy).toHaveBeenCalled();
        expect(msgSpy).toHaveBeenCalledWith('test', '');
      });

      it('should message room if notification array has notification message', async () => {
        process.env.HUBOT_PLUSPLUS_NOTIFICATION_ROOM = 'test';
        roomRobot.emit('plus-plus', [
          {
            notificationMessage: 'test',
          },
        ]);
        expect(room.messages.length).toBe(0);
        expect(msgSpy).toHaveBeenCalled();
        expect(msgSpy).toHaveBeenCalledWith('test', 'test');
      });

      it('should message room if notification has notification message', async () => {
        process.env.HUBOT_PLUSPLUS_NOTIFICATION_ROOM = 'test';
        roomRobot.emit('plus-plus', {
          notificationMessage: 'test',
        });
        expect(room.messages.length).toBe(0);
        expect(msgSpy).toHaveBeenCalled();
        expect(msgSpy).toHaveBeenCalledWith('test', 'test');
      });
    });
  });
});
