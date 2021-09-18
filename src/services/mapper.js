const { WebClient } = require('@slack/client');
const DatabaseService = require('./database');
const { scoresDocumentName } = require('../data/scores');

async function mapUsersToDb(msg, props) {
  if (msg.message.user.id !== 'UD46NSKSM' && msg.message.user.id !== 'U0231VDAB1B') {
    msg.reply('Sorry, can\'t do that https://i.imgur.com/Gp6wNZr.gif');
    return;
  }
  const { robot } = msg;
  const databaseService = new DatabaseService({ robot, ...props });
  await databaseService.init();
  const db = await databaseService.getDb();

  const web = new WebClient(msg.robot.adapter.options.token);
  const { members } = await web.users.list();

  const mappings = [];
  for (const member of members) {
    try {
      msg.robot.logger.debug('Map this member', JSON.stringify(member));
      const localMember = await databaseService.getUser(member.name);
      localMember.slackId = member.id;
      if (localMember._id) {
        await db.collection(scoresDocumentName).replaceOne({ name: localMember.name }, localMember);
        mappings.push(`\`{ name: ${localMember.name}, slackId: ${localMember.slackId}, id: ${localMember._id} }\``);
      }
      msg.robot.logger.debug(`Save the new member ${JSON.stringify(localMember)}`);
    } catch (er) {
      msg.robot.logger.error('failed to find', member, er);
    }
  }
  msg.reply(`Ding fries are done. We mapped ${mappings.length} of ${members.length} users. \n${mappings.join('\n')}`);
}

async function mapMoreUserFieldsBySlackId(msg, props) {
  if (msg.message.user.id !== 'UD46NSKSM' && msg.message.user.id !== 'U0231VDAB1B') {
    msg.reply('Sorry, can\'t do that https://i.imgur.com/Gp6wNZr.gif');
    return;
  }
  const { robot } = msg;
  const databaseService = new DatabaseService({ robot, ...props });
  await databaseService.init();
  const db = await databaseService.getDb();

  const web = new WebClient(msg.robot.adapter.options.token);
  const { members } = await web.users.list();
  for (const member of members) {
    if (member.profile.email) {
      try {
        msg.robot.logger.debug('Map this member', JSON.stringify(member));
        const localMember = await databaseService.getUser(member);
        localMember.slackId = member.id;
        localMember.slackEmail = member.profile.email;
        if (localMember._id) {
          await db.collection(scoresDocumentName).replaceOne({ slackId: localMember.slackId }, localMember);
        }
        msg.robot.logger.debug(`Save the new member ${JSON.stringify(localMember)}`);
      } catch (er) {
        msg.robot.logger.error('failed to find', member, er);
      }
    }
  }
  msg.reply('Ding fries are done.');
}

async function mapSingleUserToDb(msg, props) {
  if (msg.message.user.id !== 'UD46NSKSM' && msg.message.user.id !== 'U0231VDAB1B') {
    msg.reply('Sorry, can\'t do that https://i.imgur.com/Gp6wNZr.gif');
    return;
  }
  const { robot } = msg;
  const { mentions } = msg.message;
  if (!mentions) {
    msg.reply('You need to @ someone to map.');
    return;
  }
  const userMentions = mentions.filter((men) => men.type === 'user');
  if (userMentions > 1) {
    userMentions.shift(); // shift off @hubot
  }
  const to = userMentions.shift();
  const databaseService = new DatabaseService({ robot, ...props });
  await databaseService.init();
  const db = await databaseService.getDb();

  const web = new WebClient(msg.robot.adapter.options.token);
  const { user } = await web.users.info({ user: to.id });

  try {
    msg.robot.logger.debug('Map this member', JSON.stringify(user));
    const localMember = await databaseService.getUser(user.name);
    localMember.slackId = user.id;
    // eslint-disable-next-line no-underscore-dangle
    if (localMember._id) {
      await db.collection(scoresDocumentName).replaceOne({ name: localMember.name }, localMember);
      msg.reply(`Mapping completed for ${to.name}: { name: ${localMember.name}, slackId: ${localMember.slackId}, id: ${localMember._id} }`);
      return;
    }
    msg.robot.logger.debug(`Save the new member ${JSON.stringify(localMember)}`);
  } catch (er) {
    msg.robot.logger.error('failed to find', user, er);
  }
}

async function unmapUsersToDb(msg, props) {
  if (msg.message.user.id !== 'UD46NSKSM' && msg.message.user.id !== 'U0231VDAB1B') {
    msg.reply('Sorry, can\'t do that https://i.imgur.com/Gp6wNZr.gif');
    return;
  }
  const { robot } = msg;
  const databaseService = new DatabaseService({ robot, ...props });
  await databaseService.init();

  try {
    const db = await databaseService.getDb();
    await db.collection(scoresDocumentName).updateMany({}, { $unset: { slackId: 1 } });
  } catch (er) {
    msg.robot.logger.error('failed to unset all slack ids', er);
  }
  msg.reply('Ding fries are done. We unmapped all users');
}

module.exports = { mapUsersToDb, unmapUsersToDb, mapSingleUserToDb, mapMoreUserFieldsBySlackId };
