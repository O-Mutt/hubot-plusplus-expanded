const { H } = require('../helpers');

class EventHandlerService {
  static sendPlusPlusNotification(robot, notificationObject) {
    let message = '';
    if (Array.isArray(notificationObject)) {
      message = notificationObject.map((n) => n.notificationMessage).join('\n');
    } else if (
      Object.prototype.hasOwnProperty.call(
        notificationObject,
        'notificationMessage',
      )
    ) {
      message = notificationObject.notificationMessage;
    }
    const { notificationsRoom } = H.getProcessVariables(process.env);
    if (notificationsRoom) {
      robot.messageRoom(notificationsRoom, message);
    }
  }

  static sendPlusPlusFalsePositiveNotification(robot, notificationObject) {
    const { falsePositiveNotificationsRoom } = H.getProcessVariables(
      process.env,
    );

    if (falsePositiveNotificationsRoom) {
      robot.messageRoom(
        falsePositiveNotificationsRoom,
        notificationObject.notificationMessage,
      );
    }
  }

  /**
   *
   * @param {object} notificationObject
   * @param {object} notificationObject.to the user object who was receiving the point
   * @param {object} notificationObject.from the user object who was sending the point
   * @param {string} notificationObject.message the message that should be sent to the user
   * @param {string} notificationObject.reason a reason why the message is being sent
   */
  static logAndNotifySpam(robot, notificationObject) {
    robot.logger.error(
      `A spam event has been detected: ${notificationObject.message}. ${notificationObject.reason}`,
    );
    robot.messageRoom(
      notificationObject.from.slackId,
      `${notificationObject.message}\n\n${notificationObject.reason}`,
    );
  }
}

module.exports = EventHandlerService;
module.exports.ehs = EventHandlerService;
