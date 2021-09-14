const { WebClient } = require('@slack/client');
const DatabaseService = require('./database');
const { scoresDocumentName } = require('../data/scores');

async function mapUsersToDb(msg, props) {
  const { robot } = msg;
  const databaseService = new DatabaseService({ robot, ...props });
  await databaseService.init();
  const db = await databaseService.getDb();

  const web = new WebClient(msg.robot.adapter.options.token);
  const { members } = await web.users.list();

  for (const member of members) {
    try {
      msg.robot.logger.debug('Map this member', JSON.stringify(member));
      const localMember = await databaseService.getUser({ name: member.name });
      localMember.slackId = member.id;
      // eslint-disable-next-line no-underscore-dangle
      if (localMember._id) {
        await db.collection(scoresDocumentName).replaceOne({ name: localMember.name }, localMember);
      }
      msg.robot.logger.debug(`Save the new member ${JSON.stringify(localMember)}`);
    } catch (er) {
      msg.robot.logger.error('failed to find', member, er);
    }
  }
}

async function unmapUsersToDb(msg, props) {
  const { robot } = msg;
  const databaseService = new DatabaseService({ robot, ...props });
  await databaseService.init();

  try {
    const db = await databaseService.getDb();
    await db.collection(scoresDocumentName).updateMany({}, { $unset: { slackId: 1 } });
  } catch (er) {
    msg.robot.logger.error('failed to unset all slack ids', er);
  }
}

module.exports = { mapUsersToDb, unmapUsersToDb };
