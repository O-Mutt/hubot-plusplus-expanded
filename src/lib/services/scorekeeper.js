const { dbs } = require('./database');
const { H } = require('../helpers');

class ScoreKeeperService {
  /**
   * Method to allow up or down vote of a user
   *
   * userName - the user who is receiving the score change
   * from - the user object that is sending the score change
   * reason - the reason for score change
   * incrementValue - [number] the value to change the score by
   * return scoreObject - the new document for the user who received the score
   */
  static async incrementScore(robot, to, from, room, reason, incrementValue) {
    const parsedFrom =
      typeof from === 'string' ? { name: from, id: from } : from;
    let toUser;
    let fromUser;
    try {
      toUser = await ScoreKeeperService.getUser(robot, to);
      fromUser = await ScoreKeeperService.getUser(robot, parsedFrom);
      if (
        (await ScoreKeeperService.isSpam(robot, toUser, fromUser)) ||
        ScoreKeeperService.isSendingToSelf(robot, toUser, fromUser) ||
        ScoreKeeperService.isBot(robot, parsedFrom, room)
      ) {
        throw new Error(
          `I'm sorry <@${fromUser.slackId}>, I'm afraid I can't do that.`,
        );
      }
      toUser.score = parseInt(toUser.score, 10) + parseInt(incrementValue, 10);
      if (reason) {
        const oldReasonScore = toUser.reasons[`${reason}`]
          ? toUser.reasons[`${reason}`]
          : 0;
        toUser.reasons[`${reason}`] = oldReasonScore + incrementValue;
      }

      await dbs.savePointsGiven(robot, parsedFrom, toUser, incrementValue);
      let saveResponse = await dbs.saveUser(
        robot,
        toUser,
        fromUser,
        room,
        reason,
        incrementValue,
      );
      try {
        await dbs.savePlusPlusLog(
          robot,
          toUser,
          fromUser,
          room,
          reason,
          incrementValue,
        );
      } catch (e) {
        robot.logger.error(
          `failed saving spam log for user ${toUser.name} from ${parsedFrom.name} in room ${room} because ${reason}`,
          e,
        );
      }

      if (saveResponse.accountLevel > 1) {
        saveResponse = await dbs.transferScoreFromBotToUser(
          robot,
          toUser,
          incrementValue,
          fromUser,
        );
      }
      return { toUser: saveResponse, fromUser };
    } catch (e) {
      robot.logger.error(
        `failed to ${incrementValue > 0 ? 'add' : 'subtract'} point to [${
          to.name || 'no to'
        }] from [${
          parsedFrom ? parsedFrom.name : 'no from'
        }] because [${reason}] object [${JSON.stringify(toUser)}]`,
        e,
      );
      throw e;
    }
  }

  static async transferTokens(robot, to, from, room, reason, numberOfTokens) {
    let toUser;
    let fromUser;
    try {
      toUser = await ScoreKeeperService.getUser(robot, to);
      fromUser = await ScoreKeeperService.getUser(robot, from);
      if (toUser.accountLevel >= 2 && fromUser.accountLevel >= 2) {
        if (
          (await ScoreKeeperService.isSpam(robot, toUser, fromUser)) ||
          ScoreKeeperService.isSendingToSelf(robot, toUser, fromUser) ||
          ScoreKeeperService.isBot(robot, from, room)
        ) {
          throw new Error(
            `I'm sorry <@${fromUser.slackId}>, I'm afraid I can't do that.`,
          );
        }
        if (fromUser.token >= parseInt(numberOfTokens, 10)) {
          fromUser.token =
            parseInt(fromUser.token, 10) - parseInt(numberOfTokens, 10);
          toUser.token =
            parseInt(toUser.token, 10) + parseInt(numberOfTokens, 10);
          if (reason) {
            const oldReasonScore = toUser.reasons[`${reason}`]
              ? toUser.reasons[`${reason}`]
              : 0;
            toUser.reasons[`${reason}`] = oldReasonScore + numberOfTokens;
          }

          await dbs.savePointsGiven(robot, from, toUser, numberOfTokens);
          const saveResponse = await dbs.saveUser(
            robot,
            toUser,
            fromUser,
            room,
            reason,
            numberOfTokens,
          );
          try {
            await dbs.savePlusPlusLog(
              robot,
              toUser,
              fromUser,
              room,
              reason,
              numberOfTokens,
            );
          } catch (e) {
            robot.logger.error(
              `failed saving spam log for user ${toUser.name} from ${from.name} in room ${room} because ${reason}`,
              e,
            );
          }
          await dbs.saveUser(
            robot,
            fromUser,
            toUser,
            room,
            reason,
            -numberOfTokens,
          );
          return {
            toUser: saveResponse,
            fromUser,
          };
        }
        // from has too few tokens to send that many
        throw new Error(
          `You don't have enough tokens to send ${numberOfTokens} to ${toUser.name}`,
        );
      } else {
        // to or from is not level 2
        throw new Error(
          `In order to send tokens to ${toUser.name} you both must be, at least, level 2.`,
        );
      }
    } catch (e) {
      robot.logger.error(
        `failed to transfer tokens to [${to.name || 'no to'}] from [${
          from ? from.name : 'no from'
        }] because [${reason}] object [${toUser.name}]`,
        e,
      );
      throw e;
    }
  }

  static async getUser(robot, user) {
    const dbUser = await dbs.getUser(robot, user);
    return dbUser;
  }

  static async erase(robot, user, from, room, reason) {
    if (reason) {
      robot.logger.error(
        `Erasing score for reason ${reason} for ${user} by ${from}`,
      );
      await dbs.erase(user, reason);
      return true;
    }
    robot.logger.error(`Erasing all scores for ${user} by ${from}`);
    await dbs.erase(user);

    return true;
  }

  static isSendingToSelf(robot, to, from) {
    const { spamMessage } = H.getProcessVars(process.env);
    robot.logger.debug(
      `Checking if is to self. To [${to.name}] From [${from.name}], Valid: ${
        to.name !== from.name
      }`,
    );
    const isToSelf = to.name === from.name;
    if (isToSelf) {
      robot.emit('plus-plus-spam', {
        to,
        from,
        message: spamMessage,
        reason: 'Looks like you may be trying to send a point to yourself.',
      });
    }
    return isToSelf;
  }

  static async isSpam(robot, to, from) {
    const { spamMessage } = H.getProcessVars(process.env);
    const toId = to.slackId || to.name;
    const fromId = from.slackId || from.name;
    robot.logger.debug(`Checking spam to [${to.name}] from [${from.name}]`);
    const isSpam = await dbs.isSpam(robot, toId, fromId);
    if (isSpam) {
      robot.emit('plus-plus-spam', {
        to,
        from,
        message: spamMessage,
        reason: `You recently sent <@${toId}> a point.`,
      });
    }
    return isSpam;
  }

  /**
   * tries to detect bots
   * from - object from the msg.message.user
   * return {boolean} true if it is a bot
   */
  static isBot(robot, from, _room) {
    const { spamMessage } = H.getProcessVars(process.env);

    let isBot = false;
    robot.logger.debug(
      'checking the from user for is robot',
      from,
      from.is_bot,
    );
    if (from.is_bot) {
      isBot = true;
      robot.logger.error('A bot is sending points in DM');
      robot.emit('plus-plus-spam', {
        to: undefined,
        from,
        message: spamMessage,
        reason: "You can't have a bot do the dirty work.",
      });
    }
    return isBot;
  }
}

module.exports = ScoreKeeperService;
module.exports.sks = ScoreKeeperService;
