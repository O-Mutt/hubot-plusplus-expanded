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
    this.databaseService = new DatabaseService(params);
    this.databaseService.init(); // this is async but it is just initializing the db connection, we let it run
  }

  async add(user, from, room, reason) {
    let incScoreObj = { score: 1 };
    try {
      const toUser = await this.databaseService.getUser(user);
      if (await this.validate(toUser, from)) {
        if (reason) {
          incScoreObj = {
            score: 1,
            [`reasons.${reason}`]: 1,
          };
        }

        await this.databaseService.savePointsGiven(from, toUser.name, 1);
        const saveResponse = await this.databaseService.saveUser(toUser, from, room, reason, incScoreObj);
        return saveResponse;
      }

      // this add is invalid
      this.robot.messageRoom(from.id, this.spamMessage);
    } catch (e) {
      this.robot.logger.error(`failed to add point to [${user || 'no to'}] from [${from ? from.name : 'no from'}] because [${reason}] object [${JSON.stringify(incScoreObj)}]`, e);
    }
    return [null, null, null];
  }

  async subtract(user, from, room, reason) {
    let decScoreObj = { score: -1 };
    try {
      const toUser = await this.databaseService.getUser(user);
      if (await this.validate(toUser, from)) {
        if (reason) {
          decScoreObj = {
            score: -1,
            [`reasons.${reason}`]: -1,
          };
        }

        await this.databaseService.savePointsGiven(from, toUser.name, -1);
        const saveResponse = await this.databaseService.saveUser(toUser, from, room, reason, decScoreObj);
        return saveResponse;
      }

      // this subtraction is invalid
      this.robot.messageRoom(from.id, this.spamMessage);
    } catch (e) {
      this.robot.logger.error(`failed to subtract point to [${user || 'no to'}] from [${from ? from.name : 'no from'}] because [${reason}] object [${JSON.stringify(decScoreObj)}]`, e);
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
    return (user.name !== from.name) && !await this.databaseService.isSpam(user.name, from);
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
