const helpers = require('./lib/helpers');

module.exports = (robot) => {
  const procVars = helpers.getProcessVariables(process.env);

  robot.on('plus-plus', sendPlusPlusNotification);
  robot.on('plus-plus-failure', sendPlusPlusFalsePositiveNotification);
  robot.on('plus-plus-spam', logAndNotifySpam);

  function sendPlusPlusNotification(notificationObject) {
    if (procVars.notificationsRoom) {
      robot.messageRoom(procVars.notificationsRoom, notificationObject.notificationMessage);
    }
  }

  function sendPlusPlusFalsePositiveNotification(notificationObject) {
    if (procVars.falsePositiveNotificationsRoom) {
      robot.messageRoom(procVars.falsePositiveNotificationsRoom, notificationObject.notificationMessage);
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
  function logAndNotifySpam(notificationObject) {
    robot.logger.error(`A spam event has been detected: ${notificationObject.message}. ${notificationObject.reason}`);
    robot.messageRoom(notificationObject.from.slackId, `${notificationObject.message}\n\n${notificationObject.reason}`);
  }
};
