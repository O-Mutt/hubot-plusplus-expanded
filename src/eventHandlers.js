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
  robot.on('plus-plus', (eventArgs) =>
    ehs.sendPlusPlusNotification(robot, eventArgs),
  );
  robot.on('plus-plus-failure', (eventArgs) =>
    ehs.sendPlusPlusFalsePositiveNotification(robot, eventArgs),
  );
  robot.on('plus-plus-spam', (eventArgs) =>
    ehs.logAndNotifySpam(robot, eventArgs),
  );
};
