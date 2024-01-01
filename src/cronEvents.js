/* eslint-disable no-underscore-dangle */
// Description:
//   Cron event that sends out monthly scoreboards to a slack channel
//
// Commands:
//   None
//
//
// Author:
//  O'Mutt (Matt@OKeefe.dev)

const clark = require('clark');
const _ = require('lodash');
const { CronJob } = require('cron');

const DatabaseService = require('./lib/services/database');
const { H } = require('./lib/helpers');

module.exports = function cron(robot) {
  const procVars = H.getProcessVariables(process.env);
  const databaseService = new DatabaseService(robot);

  if (!procVars.notificationsRoom) {
    return;
  }

  const { monthlyScoreboardCron, monthlyScoreboardDayOfWeek } = procVars;
  const job = new CronJob(
    monthlyScoreboardCron,
    async () => {
      if (H.isScoreboardDayOfWeek(robot, monthlyScoreboardDayOfWeek)) {
        robot.logger.debug('running the cron job');

        // Senders
        const topSenders = await databaseService.getTopSenderInDuration(10, 30);
        let message = [];
        if (topSenders.length > 0) {
          for (
            let i = 0, end = topSenders.length - 1, asc = end >= 0;
            asc ? i <= end : i >= end;
            asc ? i++ : i--
          ) {
            const person = `<@${topSenders[i]._id}>`;
            const pointStr =
              topSenders[i].scoreChange > 1 ? 'points given' : 'point given';
            message.push(
              `${i + 1}. ${person} (${topSenders[i].scoreChange} ${pointStr})`,
            );
          }
        } else {
          message.push('No scores to keep track of yet!');
        }

        let graphSize = Math.min(topSenders.length, Math.min(10, 20));
        message.splice(
          0,
          0,
          clark(_.take(_.map(topSenders, 'scoreChange'), graphSize)),
        );
        message.splice(
          0,
          0,
          `:tada: The top 10 ${robot.name} point senders over the last month! :tada:`,
        );
        robot.messageRoom(procVars.notificationsRoom, message.join('\n'));

        // Recipients
        const topRecipient = await databaseService.getTopReceiverInDuration(
          10,
          30,
        );
        message = [];
        if (topRecipient.length > 0) {
          for (
            let i = 0, end = topRecipient.length - 1, asc = end >= 0;
            asc ? i <= end : i >= end;
            asc ? i++ : i--
          ) {
            const person = `<@${topRecipient[i]._id}>`;
            const pointStr =
              topRecipient[i].scoreChange > 1
                ? 'points received'
                : 'point received';
            message.push(
              `${i + 1}. ${person} (${
                topRecipient[i].scoreChange
              } ${pointStr})`,
            );
          }
        } else {
          message.push('No scores to keep track of yet!');
        }

        graphSize = Math.min(topRecipient.length, Math.min(10, 20));
        message.splice(
          0,
          0,
          clark(_.take(_.map(topRecipient, 'scoreChange'), graphSize)),
        );
        message.splice(
          0,
          0,
          `:tada: The top 10 ${robot.name} point recipients over the last month! :tada:`,
        );
        robot.messageRoom(procVars.notificationsRoom, message.join('\n'));

        // Room
        const topRoom = await databaseService.getTopRoomInDuration(3, 30);
        message = [];
        if (topRoom.length > 0) {
          for (
            let i = 0, end = topRoom.length - 1, asc = end >= 0;
            asc ? i <= end : i >= end;
            asc ? i++ : i--
          ) {
            const person = `<#${topRoom[i]._id}>`;
            const pointStr =
              topRoom[i].scoreChange > 1 ? 'points given' : 'point given';
            message.push(
              `${i + 1}. ${person} (${topRoom[i].scoreChange} ${pointStr})`,
            );
          }
        } else {
          message.push('No scores to keep track of yet!');
        }

        graphSize = Math.min(topRoom.length, Math.min(10, 20));
        message.splice(
          0,
          0,
          clark(_.take(_.map(topRoom, 'scoreChange'), graphSize)),
        );
        message.splice(
          0,
          0,
          `:tada: The top 3 rooms that sent ${robot.name} point(s) over the last month! :tada:`,
        );
        robot.messageRoom(procVars.notificationsRoom, message.join('\n'));
      }
    },
    null,
    true,
    'America/Chicago',
  );
  job.start();
};
