const clark = require('clark');
const moment = require('moment');
const _ = require('lodash');
const { CronJob } = require('cron');

const helpers = require('./lib/helpers');
const DatabaseService = require('./lib/services/database');

module.exports = (robot) => {
  const procVars = helpers.getProcessVariables(process.env);
  const databaseService = new DatabaseService({ robot, ...procVars });

  const { monthlyScoreboardCron, monthlyScoreboardDayOfWeek } = procVars;
  const job = new CronJob(monthlyScoreboardCron, async () => {
    if (isScoreboardDayOfWeek()) {
      robot.logger.debug('running the cron job');
      // run the thing
      const topSenders = await databaseService.getTopSenderInDuration(10, 30);
      robot.logger.debug(`Top senders\n\n ${JSON.stringify(topSenders)}`);
      const message = [];
      if (topSenders.length > 0) {
        for (let i = 0, end = topSenders.length - 1, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
          const person = `<@${topSenders.from}>`;
          const pointStr = topSenders[i].scoreChange > 1 ? 'points given' : 'point given';
          message.push(`${i + 1}. ${person} (${topSenders[i].scoreChange} ${pointStr})`);
        }
      } else {
        message.push('No scores to keep track of yet!');
      }

      const graphSize = Math.min(topSenders.length, Math.min(10, 20));
      message.splice(0, 0, clark(_.take(_.map(topSenders, 'scoreChange'), graphSize)));
      message.splice(0, 0, `:tada: The top 10 ${robot.name} point senders over the last month! :tada:`);
      if (procVars.falsePositiveNotificationsRoom) {
        robot.messageRoom(procVars.notificationsRoom, message.join('\n'));
      }
    }
  }, null, true, 'America/Chicago');
  job.start();

  function isScoreboardDayOfWeek() {
    robot.logger.debug(`Run the cron but lets check what day it is Moment day: [${moment().day()}], Configured Day of Week: [${monthlyScoreboardDayOfWeek}], isThatDay: [${moment().day() === monthlyScoreboardDayOfWeek}]`);
    const isToday = moment().day() === monthlyScoreboardDayOfWeek;
    return isToday;
  }
};
