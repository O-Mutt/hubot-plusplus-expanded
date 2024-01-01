const { H } = require('../helpers');

class EventHandlerService {
  constructor(robot) {
    this.procVars = H.getProcessVariables(process.env);
    this.robot = robot;
  }

  sendPlusPlusNotification(notificationObject) {
    if (this.procVars.notificationsRoom) {
      this.robot.messageRoom(
        this.procVars.notificationsRoom,
        notificationObject.notificationMessage,
      );
    }
  }

  sendPlusPlusFalsePositiveNotification(notificationObject) {
    if (this.procVars.falsePositiveNotificationsRoom) {
      this.robot.messageRoom(
        this.procVars.falsePositiveNotificationsRoom,
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
  logAndNotifySpam(notificationObject) {
    this.robot.logger.error(
      `A spam event has been detected: ${notificationObject.message}. ${notificationObject.reason}`,
    );
    this.robot.messageRoom(
      notificationObject.from.slackId,
      `${notificationObject.message}\n\n${notificationObject.reason}`,
    );
  }
}

module.exports = EventHandlerService;
