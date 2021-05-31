/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
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
  async incrementScore(userName, from, room, reason, incrementValue) {
    from = typeof from === 'string' ? { name: from, id: from } : from;
    let toUser;
    let fromUser;
    try {
      toUser = await this.getUser(userName);
      fromUser = await this.getUser(from.name);
      if (await this.isNotSpam(toUser, fromUser) && this.isNotSendingToSelf(toUser, fromUser)) {
        toUser.score = parseInt(toUser.score, 10) + parseInt(incrementValue, 10);
        if (reason) {
          const oldReasonScore = toUser.reasons[`${reason}`] ? toUser.reasons[`${reason}`] : 0;
          toUser.reasons[`${reason}`] = oldReasonScore + incrementValue;
        }

        await this.databaseService.savePointsGiven(from, toUser, incrementValue);
        const saveResponse = await this.databaseService.saveUser(toUser, fromUser, room, reason);
        return saveResponse;
      }

      // this add is invalid
      if (!await this.isNotSpam(toUser, fromUser)) {
        this.robot.messageRoom(from.id, this.spamMessage);
      }
    } catch (e) {
      this.robot.logger.error(`failed to ${incrementValue > 0 ? 'add' : 'subtract'} point to [${userName || 'no to'}] from [${from ? from.name : 'no from'}] because [${reason}] object [${JSON.stringify(toUser)}]`, e);
    }
    return undefined;
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

  // eslint-disable-next-line
  last(room) {
    /* const last = this.storage.last[room];
    if (typeof last === 'string') {
      return [last, ''];
    } else {
      return [last.user, last.reason];
    } */
  }

  isNotSendingToSelf(to, from) {
    this.robot.logger.debug(`Checking if is to self. To [${to.name}] From [${from.name}], Valid: ${to.name !== from.name}`);
    return to.name !== from.name;
  }

  async isNotSpam(to, from) {
    this.robot.logger.debug(`Checking spam to [${to.name}] from [${from.name}]`);
    const isSpam = await this.databaseService.isSpam(to.name, from.name);
    return !isSpam;
  }

  // eslint-disable-next-line
  normalize(fn) {
    /* const scores = {};

    _.each(this.storage.scores, function(score, name) {
      scores[name] = fn(score);
      if (scores[name] === 0) { return delete scores[name]; }
    });

    this.storage.scores = scores;
    return this.robot.brain.save(); */
  }
}

module.exports = ScoreKeeper;
