/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-use-before-define */
// Description:
//   Admin handlers for mapping slack users to existing hubot users
//
// Commands:
//   @hubot try to map all slack users to db users - tries to map all users to the db
//   @hubot try to map more data to all slack users to db users - tries to map more data to all users to the db
//   @hubot try to map @.* to db users - tries to map a single user to the db
//   @hubot unmap all users - unmaps all users from the db
//   @hubot map all slackIds to slackEmail - maps all slackIds to slackEmail
//
//
// Author:
//  O'Mutt (Matt@OKeefe.dev)

const { WebClient } = require('@slack/client');
const DatabaseService = require('../lib/services/database');
const { scoresDocumentName } = require('../lib/data/scores');

module.exports = function migrations(robot) {
  robot.respond(/try to map all slack users to db users/, mapUsersToDb);
  robot.respond(
    /try to map more data to all slack users to db users/,
    mapMoreUserFieldsBySlackId,
  );
  robot.respond(/try to map @.* to db users/, mapSingleUserToDb);
  robot.respond(/unmap all users/, unmapUsersToDb);
  robot.respond(/map all slackIds to slackEmail/, mapSlackIdToEmail);

  async function mapUsersToDb(msg) {
    if (
      msg.message.user.id !== 'UD46NSKSM' &&
      msg.message.user.id !== 'U0231VDAB1B'
    ) {
      msg.reply("Sorry, can't do that https://i.imgur.com/Gp6wNZr.gif");
      return;
    }
    const databaseService = new DatabaseService(robot);
    await databaseService.init();
    const db = await databaseService.getDb();

    const web = new WebClient(robot.adapter.options.token);
    const { members } = await web.users.list();

    const mappings = [];
    for (const member of members) {
      try {
        robot.logger.debug('Map this member', JSON.stringify(member));
        const localMember = await databaseService.getUser(member.name);
        localMember.slackId = member.id;
        if (localMember._id) {
          await db
            .collection(scoresDocumentName)
            .replaceOne({ name: localMember.name }, localMember);
          mappings.push(
            `\`{ name: ${localMember.name}, slackId: ${localMember.slackId}, id: ${localMember._id} }\``,
          );
        }
        robot.logger.debug(
          `Save the new member ${JSON.stringify(localMember)}`,
        );
      } catch (er) {
        robot.logger.error('failed to find', member, er);
      }
    }
    msg.reply(
      `Ding fries are done. We mapped ${mappings.length} of ${
        members.length
      } users. \n${mappings.join('\n')}`,
    );
  }

  async function mapMoreUserFieldsBySlackId(msg) {
    if (
      msg.message.user.id !== 'UD46NSKSM' &&
      msg.message.user.id !== 'U0231VDAB1B'
    ) {
      msg.reply("Sorry, can't do that https://i.imgur.com/Gp6wNZr.gif");
      return;
    }
    const databaseService = new DatabaseService(robot);
    await databaseService.init();
    const db = await databaseService.getDb();

    const web = new WebClient(robot.adapter.options.token);
    const { members } = await web.users.list();
    for (const member of members) {
      if (member.profile.email) {
        try {
          robot.logger.debug('Map this member', JSON.stringify(member));
          const localMember = await databaseService.getUser(member);
          localMember.slackId = member.id;
          localMember.slackEmail = member.profile.email;
          if (localMember._id) {
            await db
              .collection(scoresDocumentName)
              .replaceOne({ slackId: localMember.slackId }, localMember);
          }
          robot.logger.debug(
            `Save the new member ${JSON.stringify(localMember)}`,
          );
        } catch (er) {
          robot.logger.error('failed to find', member, er);
        }
      }
    }
    msg.reply('Ding fries are done.');
  }

  async function mapSingleUserToDb(msg) {
    if (
      msg.message.user.id !== 'UD46NSKSM' &&
      msg.message.user.id !== 'U0231VDAB1B'
    ) {
      msg.reply("Sorry, can't do that https://i.imgur.com/Gp6wNZr.gif");
      return;
    }
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
    const databaseService = new DatabaseService(robot);
    await databaseService.init();
    const db = await databaseService.getDb();

    const web = new WebClient(robot.adapter.options.token);
    const { user } = await web.users.info({ user: to.id });

    try {
      robot.logger.debug('Map this member', JSON.stringify(user));
      const localMember = await databaseService.getUser(user);
      localMember.slackId = user.id;
      // eslint-disable-next-line no-underscore-dangle
      if (localMember._id) {
        await db
          .collection(scoresDocumentName)
          .replaceOne({ name: localMember.name }, localMember);
        msg.reply(
          `Mapping completed for ${to.name}: { name: ${localMember.name}, slackId: ${localMember.slackId}, id: ${localMember._id} }`,
        );
        return;
      }
      robot.logger.debug(`Save the new member ${JSON.stringify(localMember)}`);
    } catch (er) {
      robot.logger.error('failed to find', user, er);
    }
  }

  async function unmapUsersToDb(msg) {
    if (
      msg.message.user.id !== 'UD46NSKSM' &&
      msg.message.user.id !== 'U0231VDAB1B'
    ) {
      msg.reply("Sorry, can't do that https://i.imgur.com/Gp6wNZr.gif");
      return;
    }
    const databaseService = new DatabaseService(robot);
    await databaseService.init();

    try {
      const db = await databaseService.getDb();
      await db
        .collection(scoresDocumentName)
        .updateMany({}, { $unset: { slackId: 1 } });
    } catch (er) {
      robot.logger.error('failed to unset all slack ids', er);
    }
    msg.reply('Ding fries are done. We unmapped all users');
  }

  async function mapSlackIdToEmail(msg) {
    if (
      msg.message.user.id !== 'UD46NSKSM' &&
      msg.message.user.id !== 'U0231VDAB1B'
    ) {
      msg.reply("Sorry, can't do that https://i.imgur.com/Gp6wNZr.gif");
      return;
    }

    const databaseService = new DatabaseService(robot);
    await databaseService.init();
    const db = await databaseService.getDb();

    try {
      const missingEmailUsers = await db
        .collection(scoresDocumentName)
        .find({ slackId: { $exists: true }, slackEmail: { $exists: false } })
        .toArray();
      const web = new WebClient(robot.adapter.options.token);

      missingEmailUsers.forEach(async (user) => {
        const replacedUser = { ...user };
        robot.logger.debug(
          'Map this member',
          replacedUser.slackId,
          replacedUser.name,
        );
        let slackUser;
        try {
          slackUser = (await web.users.info({ user: replacedUser.slackId }))
            .user;
        } catch (e) {
          robot.logger.error(
            `error retrieving user: ${replacedUser.slackId} ${replacedUser.name}`,
          );
        }
        if (slackUser.profile && slackUser.profile.email) {
          replacedUser.slackEmail = slackUser.profile.email;
          await db
            .collection(scoresDocumentName)
            .replaceOne({ slackId: replacedUser.slackId }, replacedUser);
        }
        msg.send(
          `Mapping completed for ${replacedUser.name}: { name: ${replacedUser.name}, slackId: <@${replacedUser.slackId}>, email: ${replacedUser.slackEmail} }`,
        );
      });
    } catch (er) {
      robot.logger.error('Error processing users', er);
    }
  }
};
