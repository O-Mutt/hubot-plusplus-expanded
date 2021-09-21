/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const helpers = require('./helpers');
const DatabaseService = require('./services/database');

class ScoreKeeper {
  /*
  * params.robot
  * params.peerFeedbackUrl
  * params.furtherFeedbackSuggestedScore
  * params.spamMessage
  * params.mongoUri
  */
  constructor(params) {
    for (const key in params) {
      this[key] = params[key];
    }
    this.databaseService = new DatabaseService(params);
    this.databaseService.init(); // this is async but it is just initializing the db connection, we let it run
  }

  /*
  * Method to allow up or down vote of a user
  *
  * userName - the user who is receiving the score change
  * from - the user object that is sending the score change
  * reason - the reason for score change
  * incrementValue - [number] the value to change the score by
  * return scoreObject - the new document for the user who received the score
  */
  async incrementScore(to, from, room, reason, incrementValue) {
    from = typeof from === 'string' ? { name: from, id: from } : from;
    let toUser;
    let fromUser;
    try {
      toUser = await this.getUser(to);
      fromUser = await this.getUser(from);
      if (!(await this.isSpam(toUser, fromUser)) && !this.isSendingToSelf(toUser, fromUser) && !this.isBotInDm(from, room)) {
        toUser.score = parseInt(toUser.score, 10) + parseInt(incrementValue, 10);
        if (reason) {
          const oldReasonScore = toUser.reasons[`${reason}`] ? toUser.reasons[`${reason}`] : 0;
          toUser.reasons[`${reason}`] = oldReasonScore + incrementValue;
        }

        await this.databaseService.savePointsGiven(from, toUser, incrementValue);
        let saveResponse = await this.databaseService.saveUser(toUser, fromUser, room, reason, incrementValue);
        try {
          await this.databaseService.savePlusPlusLog(toUser, fromUser, room, reason, incrementValue);
        } catch (e) {
          this.robot.logger.error(`failed saving spam log for user ${toUser.name} from ${from.name} in room ${room} because ${reason}`, e);
        }

        if (saveResponse.accountLevel > 1) {
          saveResponse = await this.databaseService.transferScoreFromBotToUser(toUser, incrementValue, fromUser);
        }
        return { toUser: saveResponse, fromUser };
      }

      throw new Error(`I'm sorry ${fromUser.name}, I'm afraid I can't do that.`);
    } catch (e) {
      this.robot.logger.error(`failed to ${incrementValue > 0 ? 'add' : 'subtract'} point to [${to.name || 'no to'}] from [${from ? from.name : 'no from'}] because [${reason}] object [${JSON.stringify(toUser)}]`, e);
      throw e;
    }
  }

  async transferTokens(to, from, room, reason, numberOfTokens) {
    let toUser;
    let fromUser;
    try {
      toUser = await this.getUser(to);
      fromUser = await this.getUser(from);
      if (toUser.accountLevel >= 2 && fromUser.accountLevel >= 2) {
        if (!(await this.isSpam(toUser, fromUser))
            && !this.isSendingToSelf(toUser, fromUser)
            && !this.isBotInDm(from, room)) {
          if (fromUser.token >= parseInt(numberOfTokens, 10)) {
            fromUser.token = parseInt(fromUser.token, 10) - parseInt(numberOfTokens, 10);
            toUser.token = parseInt(toUser.token, 10) + parseInt(numberOfTokens, 10);
            if (reason) {
              const oldReasonScore = toUser.reasons[`${reason}`] ? toUser.reasons[`${reason}`] : 0;
              toUser.reasons[`${reason}`] = oldReasonScore + numberOfTokens;
            }

            await this.databaseService.savePointsGiven(from, toUser, numberOfTokens);
            const saveResponse = await this.databaseService.saveUser(toUser, fromUser, room, reason, numberOfTokens);
            try {
              await this.databaseService.savePlusPlusLog(toUser, fromUser, room, reason, numberOfTokens);
            } catch (e) {
              this.robot.logger.error(`failed saving spam log for user ${toUser.name} from ${from.name} in room ${room} because ${reason}`, e);
            }
            await this.databaseService.saveUser(fromUser, toUser, room, reason, -numberOfTokens);
            return {
              toUser: saveResponse,
              fromUser,
            };
          } else {
            // from has too few tokens to send that many
            throw new Error(`You don't have enough tokens to send ${numberOfTokens} to ${toUser.name}`);
          }
        } else {
          throw new Error(`I'm sorry ${fromUser.name}, I'm afraid I can't do that.`);
        }
      } else {
        // to or from is not level 2
        throw new Error(`In order to send tokens to ${toUser.name} you both must be, at least, level 2.`);
      }
    } catch (e) {
      this.robot.logger.error(`failed to transfer tokens to [${to.name || 'no to'}] from [${from ? from.name : 'no from'}] because [${reason}] object [${toUser.name}]`, e);
      throw e;
    }
  }

  async getUser(user) {
    const dbUser = await this.databaseService.getUser(user);
    return dbUser;
  }

  async erase(user, from, room, reason) {
    if (reason) {
      this.robot.logger.error(`Erasing score for reason ${reason} for ${user} by ${from}`);
      await this.databaseService.erase(user, reason);
      return true;
    }
    this.robot.logger.error(`Erasing all scores for ${user} by ${from}`);
    await this.databaseService.erase(user);

    return true;
  }

  isSendingToSelf(to, from) {
    this.robot.logger.debug(`Checking if is to self. To [${to.name}] From [${from.name}], Valid: ${to.name !== from.name}`);
    const isToSelf = to.name === from.name;
    if (isToSelf) {
      this.robot.emit('plus-plus-spam', {
        to,
        from,
        message: this.spamMessage,
        reason: 'Looks like you may be trying to send a point to yourself.',
      });
    }
    return isToSelf;
  }

  async isSpam(to, from) {
    const toId = to.slackId || to.name;
    const fromId = from.slackId || from.name;
    this.robot.logger.debug(`Checking spam to [${to.name}] from [${from.name}]`);
    const isSpam = await this.databaseService.isSpam(toId, fromId);
    if (isSpam) {
      this.robot.emit('plus-plus-spam', {
        to,
        from,
        message: this.spamMessage,
        reason: `You recently sent <@${toId}> a point.`,
      });
    }
    return isSpam;
  }

  /*
  * tries to detect bots
  * from - object from the msg.message.user
  * return {boolean} true if it is a bot
  */
  isBotInDm(from, room) {
    let isBot = false;
    if (from.is_bot && helpers.isPrivateMessage(room)) {
      isBot = true;
      this.robot.logger.error('A bot is sending points in DM');
    }
    if (isBot) {
      this.robot.emit('plus-plus-spam', {
        to: undefined,
        from,
        message: this.spamMessage,
        reason: 'You can\'t have a bot do the dirty work.',
      });
    }
    return isBot;
  }
}

module.exports = ScoreKeeper;
