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
    this.robot = params.robot;
    this.peerFeedbackUrl = params.peerFeedbackUrl;
    this.furtherFeedbackScore = parseInt(params.furtherFeedbackSuggestedScore, 10);
    this.spamMessage = params.spamMessage;
    this.spamTimeLimit = params.spamTimeLimit;
    this.databaseService = new DatabaseService(params);
    this.databaseService.init(); // this is async but it is just initializing the db connection, we let it run
  }

  async add(user, from, room, reason) {
    let toUser;
    try {
      toUser = await this.databaseService.getUser(user);
      if (await this.validate(toUser, from)) {
        toUser.score += 1;
        if (reason) {
          const oldReasonScore = toUser.reasons[`${reason}`] ? toUser.reasons[`${reason}`] : 0;
          toUser.reasons[`${reason}`] = oldReasonScore + 1;
        }

        await this.databaseService.savePointsGiven(from, toUser.name, 1);
        const saveResponse = await this.databaseService.saveUser(toUser, from, room, reason);
        return saveResponse;
      }

      // this add is invalid
      this.robot.messageRoom(from.id, this.spamMessage);
    } catch (e) {
      this.robot.logger.error(`failed to add point to [${user || 'no to'}] from [${from ? from.name : 'no from'}] because [${reason}] object [${JSON.stringify(toUser)}]`, e);
    }
    return [null, null, null];
  }

  async subtract(user, from, room, reason) {
    let toUser;
    try {
      toUser = await this.databaseService.getUser(user);
      if (await this.validate(toUser, from)) {
        toUser.score -= 1;
        if (reason) {
          const oldReasonScore = toUser.reasons[`${reason}`] ? toUser.reasons[`${reason}`] : 0;
          toUser.reasons[`${reason}`] = oldReasonScore - 1;
        }

        await this.databaseService.savePointsGiven(from, toUser.name, -11);
        const saveResponse = await this.databaseService.saveUser(toUser, from, room, reason);
        return saveResponse;
      }

      // this subtraction is invalid
      this.robot.messageRoom(from.id, this.spamMessage);
    } catch (e) {
      this.robot.logger.error(`failed to subtract point to [${user || 'no to'}] from [${from ? from.name : 'no from'}] because [${reason}] object [${JSON.stringify(toUser)}]`, e);
    }
    return [null, null, null];
  }

  async scoreForUser(user) {
    const dbUser = await this.databaseService.getUser(user);
    return dbUser.score;
  }

  async reasonsForUser(user) {
    const dbUser = await this.databaseService.getUser(user);
    return dbUser.reasons;
  }

  async erase(user, from, room, reason) {
    if (reason) {
      this.robot.logger.warn(`Erasing score for reason ${reason} for ${user} by ${from}`);
      this.databaseService.erase(user, reason);
      return true;
    }
    this.robot.logger.warn(`Erasing all scores for ${user} by ${from}`);
    this.databaseService.erase(user);

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

  async validate(user, from) {
    const isSpam = await this.databaseService.isSpam(user.name, from);
    const fromSelf = user.name === from.name;
    return !fromSelf && !isSpam;
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
