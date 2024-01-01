// Description:
//   This is strictly an event handler that sends notifications to a room when a plusplus event occurs
//
// Commands:
//   None
//
//
// Author:
//  O'Mutt (Matt@OKeefe.dev)

const EventHandlerService = require('./lib/services/eventHandler');

module.exports = function events(robot) {
  const ehs = new EventHandlerService(robot);

  robot.on('plus-plus', ehs.sendPlusPlusNotification);
  robot.on('plus-plus-failure', ehs.sendPlusPlusFalsePositiveNotification);
  robot.on('plus-plus-spam', ehs.logAndNotifySpam);
};
