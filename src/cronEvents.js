const clark = require('clark');
const _ = require('lodash');
const { CronJob } = require('cron');

const helpers = require('./lib/helpers');
const DatabaseService = require('./lib/services/database');

module.exports = (robot) => {
  const procVars = helpers.getProcessVariables(process.env);
  const databaseService = new DatabaseService({ robot, ...procVars });

  const job = new CronJob('10 * * * *', async () => {
    robot.logger.debug('running the cron job');
    // run the thing
    const topSenders = await databaseService.getTopSenderInDuration(10, 30);
    const message = [];
    if (topSenders.length > 0) {
      for (let i = 0, end = topSenders.length - 1, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
        const person = `<@${topSenders._id}>`;
        const pointStr = topSenders[i].scoreChange > 1 ? 'points given' : 'point given';
        message.push(`${i + 1}. ${person} (${topSenders[i].scoreChange} ${pointStr})`);
      }
    } else {
      message.push('No scores to keep track of yet!');
    }

    const graphSize = Math.min(topSenders.length, Math.min(10, 20));
    message.splice(0, 0, clark(_.take(_.map(topSenders, 'scoreChange'), graphSize)));
    if (procVars.falsePositiveNotificationsRoom) {
      robot.messageRoom(procVars.notificationsRoom, message.join('\n'));
    }
  }, null, true, 'America/Chicago');
  job.start();
};
