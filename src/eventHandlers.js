// Description:
//   This is strictly an event handler that sends notifications to a room when a plusplus event occurs
//
// Commands:
//   None
//
//
// Author:
//  O'Mutt (Matt@OKeefe.dev)

const { ehs } = require('./lib/services/eventHandler');

module.exports = function events(robot) {
  robot.on('plus-plus', ehs.sendPlusPlusNotification);
  robot.on('plus-plus-failure', ehs.sendPlusPlusFalsePositiveNotification);
  robot.on('plus-plus-spam', ehs.logAndNotifySpam);
};
