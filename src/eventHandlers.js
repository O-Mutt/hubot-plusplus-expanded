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
  // Reference ./events/plusPlusEvent.js for the event object
  robot.on('plus-plus', (...plusPlusObjects) =>
    ehs.sendPlusPlusNotification(robot, ...plusPlusObjects),
  );

  robot.on('plus-plus-failure', (...args) =>
    ehs.sendPlusPlusFalsePositiveNotification(robot, ...args),
  );
  robot.on('plus-plus-spam', (...args) => ehs.logAndNotifySpam(robot, ...args));
};
