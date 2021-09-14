const { WebClient } = require('@slack/client');
const DatabaseService = require('./database');

async function mapUsersToDb(msg, props) {
  const databaseService = new DatabaseService(props);
  databaseService.init();

  const web = new WebClient(msg.robot.adapter.options.token);
  const { members } = await web.users.list();

  // eslint-disable-next-line guard-for-in
  for (const member in members) {
    try {
      const localMember = await databaseService.getUser({ name: member.name });
      // eslint-disable-next-line no-underscore-dangle
      if (!localMember._id) {
        msg.robot.logger.debug(`failed to find ${member.name}`);
        return;
      }
      localMember.slackId = member.id;
      await databaseService.saveUser(localMember);

      msg.robot.logger.debug(`Save the new member ${localMember.name} with slack id ${localMember.slackId}`);
    } catch (er) {
      msg.robot.logger.error(`failed to find ${member.name}`);
    }
  }
}

async function unmapUsersToDb(msg, props) {
  const databaseService = new DatabaseService(props);

  databaseService.init();

  try {
    const db = await databaseService.getDb();
    await db.updateMany({}, { $unset: { slackId: 1 } });
  } catch (er) {
    msg.robot.logger.error('failed to unset all slack ids');
  }
}

module.exports = { mapUsersToDb, unmapUsersToDb };
