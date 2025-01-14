const { MongoClient } = require('mongodb');
const { formatISO, subMinutes } = require('date-fns');

const scores = require('../data/scores');
const logDocumentName = require('../data/scoreLog');
const botTokenDocumentName = require('../data/botToken');
const { H } = require('../helpers');

class DatabaseService {
  constructor() {
    this.db = null;
  }

  async init() {
    if (!this.db) {
      const { mongoUri } = H.getProcessVars(process.env);
      const client = new MongoClient(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      const connection = await client.connect();
      this.db = connection.db();
    }
  }

  async getDb() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  /*
   * user - the name of the user
   */
  async getUser(robot, user) {
    const userName = user.name ? user.name : user;
    const search = user.id ? { slackId: user.id } : { name: userName };
    robot.logger.debug(`trying to find user ${JSON.stringify(search)}`);
    const db = await this.getDb();

    const dbUser = await db
      .collection(scores.scoresDocumentName)
      .findOne(search, { sort: { score: -1 } });

    if (!dbUser) {
      robot.logger.debug('creating a new user', user);
      const newUser = await scores.createNewLevelOneUser(user, robot);
      return newUser;
    }
    return dbUser;
  }

  /*
   * user - the name of the user
   */
  async getAllUsers(robot) {
    const search = { slackId: { $exists: true } };
    robot.logger.debug('getting _all_ users');
    const db = await this.getDb();

    const dbUsers = await db
      .collection(scores.scoresDocumentName)
      .find(search)
      .toArray();
    return dbUsers;
  }

  /**
   * Saves the user with a new score
   * @param {object} user the user who is getting a point change
   * @returns {object} the updated user who received a change
   */
  async saveUser(robot, user) {
    const userName = user.name ? user.name : user;
    const search = user.slackId
      ? { slackId: user.slackId }
      : { name: userName };
    const db = await this.getDb();

    const result = await db
      .collection(scores.scoresDocumentName)
      .findOneAndUpdate(
        search,
        {
          $set: user,
        },
        {
          returnDocument: 'after',
          upsert: true,
          sort: { score: -1 },
        },
      );

    const updatedUser = result.value;

    robot.logger.debug(
      `Saving user original: [${user.name}: ${user.score}], new [${updatedUser.name}: ${updatedUser.score}]`,
    );

    return updatedUser;
  }

  async savePlusPlusLog(_robot, to, from, room, reason, incrementValue) {
    const pointsAmount = parseInt(incrementValue, 10);
    const fromId = from.slackId || from.name;
    const scoreSearch = from.slackId
      ? { slackId: from.slackId }
      : { name: from.name };
    const toId = to.slackId || to.name;
    const db = await this.getDb();
    await db
      .collection(scores.scoresDocumentName)
      .updateOne(scoreSearch, { $inc: { totalPointsGiven: pointsAmount } });
    await db.collection(logDocumentName).insertOne({
      from: fromId,
      to: toId,
      date: formatISO(new Date()),
      room,
      reason,
      scoreChange: pointsAmount,
    });
  }

  /**
   * Checks to see if the user has sent a point to the same user in a given time period
   * the time period is defined on the `process.env.SPAM_TIME_LIMIT` and defaults to 5 in minutes
   * @param {object} to the user who is receiving the point
   * @param {object} from the user who is sending the point
   * @returns {boolean} true if the user has sent a point to the same user in the time period
   * @returns {boolean} false if the user has not sent a point to the same user in the time period
   */
  async isSpam(robot, to, from) {
    robot.logger.debug('spam check');
    const { spamTimeLimit } = H.getProcessVars(process.env);
    const db = await this.getDb();
    const fiveMinutesAgo = formatISO(subMinutes(new Date(), spamTimeLimit));
    const previousScoreExists = await db
      .collection(logDocumentName)
      .countDocuments({
        from,
        to,
        date: { $gte: fiveMinutesAgo },
      });
    robot.logger.debug('spam check result', previousScoreExists);
    if (previousScoreExists !== 0) {
      robot.logger.error(`${from} is spamming points to ${to}! STOP 'EM!!!!`);
      return true;
    }

    return false;
  }

  /*
   * from - database user who is sending the score
   * to - database user who is receiving the score
   * score - the number of score that is being sent
   */
  async savePointsGiven(robot, from, to, score) {
    const { furtherFeedbackSuggestedScore, peerFeedbackUrl } = H.getProcessVars(
      process.env,
    );
    const db = await this.getDb();
    const cleanName = H.cleanAndEncode(to.name);
    const fromUser = await this.getUser(robot, from);
    const fromSearch = fromUser.slackId
      ? { slackId: fromUser.slackId }
      : { name: fromUser.name };

    const oldScore = fromUser.pointsGiven[cleanName]
      ? fromUser.pointsGiven[cleanName]
      : 0;
    // even if they are down voting them they should still get a tally as they ++/-- the same person
    fromUser.pointsGiven[cleanName] = oldScore + score;
    const result = await db
      .collection(scores.scoresDocumentName)
      .findOneAndUpdate(
        fromSearch,
        { $set: fromUser },
        {
          returnDocument: 'after',
          upsert: true,
          sort: { score: -1 },
        },
      );
    const upUser = result.value;

    if (upUser.pointsGiven[cleanName] % furtherFeedbackSuggestedScore === 0) {
      robot.logger.debug(
        `${from.name} has sent a lot of points to ${to.name} suggesting further feedback ${score}`,
      );
      const toIdent = to.slackId ? `<@${to.slackId}>` : to.name;
      await robot.messageRoom(
        from.id,
        `Looks like you've given ${toIdent} quite a few points, maybe you should look at submitting ${peerFeedbackUrl}`,
      );
    }
  }

  /**
   * Get the top {n} scores
   * @param {number} amount - the amount of scores to return
   * @returns {Promise<Array>} - the scores
   */
  async getTopScores(robot, amount) {
    const db = await this.getDb();
    const results = await db
      .collection(scores.scoresDocumentName)
      .find({})
      .sort({ score: -1, accountLevel: -1 })
      .limit(amount)
      .toArray();

    robot.logger.debug('Trying to find top scores');

    return results;
  }

  /**
   * Get the bottom {n} scores
   * @param {number} amount - the amount of scores to return
   * @returns {Promise<Array>} - the scores
   */
  async getBottomScores(robot, amount) {
    const db = await this.getDb();
    const results = await db
      .collection(scores.scoresDocumentName)
      .find({})
      .sort({ score: 1, accountLevel: -1 })
      .limit(amount)
      .toArray();

    robot.logger.debug('Trying to find bottom scores');

    return results;
  }

  /**
   * Get the top {n} token holders
   * @param {number} amount - the amount of tokens to return
   * @returns {Promise<Array>} - the tokens
   */
  async getTopTokens(robot, amount) {
    const db = await this.getDb();
    const results = await db
      .collection(scores.scoresDocumentName)
      .find({
        accountLevel: { $gte: 2 },
      })
      .sort({ token: -1, score: -1 })
      .limit(amount)
      .toArray();

    robot.logger.debug('Trying to find top tokens');

    return results;
  }

  /**
   * Get the bottom {n} token holders
   * @param {number} amount - the amount of tokens to return
   * @returns {Promise<Array>} - the tokens
   */
  async getBottomTokens(robot, amount) {
    const db = await this.getDb();
    const results = await db
      .collection(scores.scoresDocumentName)
      .find({
        accountLevel: { $gte: 2 },
      })
      .sort({ token: 1, score: 1 })
      .limit(amount)
      .toArray();

    robot.logger.debug('Trying to find bottom tokens');

    return results;
  }

  /**
   * Get the top {n} point senders
   * @param {number} amount - the amount of senders to return
   * @returns {Promise<Array>} - the senders
   */
  async getTopSender(robot, amount) {
    const db = await this.getDb();
    const results = await db
      .collection(scores.scoresDocumentName)
      .find({ totalPointsGiven: { $exists: true } })
      .sort({ totalPointsGiven: -1, accountLevel: -1 })
      .limit(amount)
      .toArray();

    robot.logger.debug('Trying to find top sender');

    return results;
  }

  /**
   * Get the bottom {n} point senders
   * @param {number} amount - the amount of senders to return
   * @returns {Promise<Array>} - the senders
   */
  async getBottomSender(robot, amount) {
    const db = await this.getDb();
    const results = await db
      .collection(scores.scoresDocumentName)
      .find({ totalPointsGiven: { $exists: true } })
      .sort({ totalPointsGiven: 1, accountLevel: -1 })
      .limit(amount)
      .toArray();

    robot.logger.debug('Trying to find bottom sender');

    return results;
  }

  async erase(user, reason) {
    const userName = user.name ? user.name : user;
    const search = user.slackId
      ? { slackId: user.slackId }
      : { name: userName };
    const db = await this.getDb();

    let result;
    if (reason) {
      const oldUser = await db
        .collection(scores.scoresDocumentName)
        .findOne(search);
      const newScore = oldUser.score - oldUser.reasons[reason];
      result = await db
        .collection(scores.scoresDocumentName)
        .updateOne(search, {
          $set: { score: newScore, reasons: { [`${reason}`]: 0 } },
        });
    } else {
      result = await db
        .collection(scores.scoresDocumentName)
        .deleteOne(search, { $set: { score: 0 } });
    }

    return result;
  }

  async updateAccountLevelToTwo(robot, user) {
    const userName = user.name ? user.name : user;
    const search = user.slackId
      ? { slackId: user.slackId }
      : { name: userName };
    const db = await this.getDb();
    let tokensAdded = 0;
    const foundUser = await db
      .collection(scores.scoresDocumentName)
      .findOne(search);
    // we are leveling up from 0 (which is level 1) -> 2 or 2 -> 3
    if (foundUser.accountLevel && foundUser.accountLevel === 2) {
      // this is a weird case and shouldn't really happen... not sure about this...
      robot.logger.debug(
        `Somehow FoundUser[${foundUser.name}] SearchedUser[${user.name}] was trying to upgrade their account to level 2.`,
      );
      return true;
    }
    foundUser.accountLevel = 2;
    foundUser.token = 0;
    tokensAdded = foundUser.score;
    await db
      .collection(scores.scoresDocumentName)
      .updateOne(search, { $set: foundUser });
    const newScore = await this.transferScoreFromBotToUser(
      robot,
      user,
      tokensAdded,
    );
    return newScore;
  }

  async getBotWallet(robot) {
    const db = await this.getDb();
    const botWallet = await db
      .collection(botTokenDocumentName)
      .findOne({ name: robot.name });
    return botWallet;
  }

  async getTopSenderInDuration(amount = 10, days = 7) {
    const db = await this.getDb();
    const topSendersForDuration = await db
      .collection(logDocumentName)
      .aggregate([
        {
          $match: {
            date: {
              $gt: new Date(
                new Date().setDate(new Date().getDate() - days),
              ).toISOString(),
            },
          },
        },
        {
          $group: { _id: '$from', scoreChange: { $sum: '$scoreChange' } },
        },
        {
          $sort: { scoreChange: -1 },
        },
      ])
      .limit(amount)
      .toArray();
    return topSendersForDuration;
  }

  async getTopReceiverInDuration(amount = 10, days = 7) {
    const db = await this.getDb();
    const topRecipientForDuration = await db
      .collection(logDocumentName)
      .aggregate([
        {
          $match: {
            date: {
              $gt: new Date(
                new Date().setDate(new Date().getDate() - days),
              ).toISOString(),
            },
          },
        },
        {
          $group: { _id: '$to', scoreChange: { $sum: '$scoreChange' } },
        },
        {
          $sort: { scoreChange: -1 },
        },
      ])
      .limit(amount)
      .toArray();
    return topRecipientForDuration;
  }

  async getTopRoomInDuration(amount = 3, days = 7) {
    const db = await this.getDb();
    const topRoomForDuration = await db
      .collection(logDocumentName)
      .aggregate([
        {
          $match: {
            date: {
              $gt: new Date(
                new Date().setDate(new Date().getDate() - days),
              ).toISOString(),
            },
          },
        },
        {
          $group: { _id: '$room', scoreChange: { $sum: '$scoreChange' } },
        },
        {
          $sort: { scoreChange: -1 },
        },
      ])
      .limit(amount)
      .toArray();
    return topRoomForDuration;
  }

  /**
   *
   * @param {string} userName the name of the user receiving the points
   * @param {number} scoreChange the increment in which the user is getting/losing points
   * @param {string} fromName the name of the user sending the points
   * @returns {object} the user who received the points updated value
   */
  async transferScoreFromBotToUser(robot, user, scoreChange, from) {
    const userName = user.name ? user.name : user;
    const search = user.slackId
      ? { slackId: user.slackId }
      : { name: userName };

    const db = await this.getDb();
    robot.logger.info(
      `We are transferring ${scoreChange} ${H.capitalizeFirstLetter(
        robot.name,
      )} Tokens to ${userName} from ${
        from ? from.name : H.capitalizeFirstLetter(robot.name)
      }`,
    );
    const result = await db
      .collection(scores.scoresDocumentName)
      .findOneAndUpdate(
        search,
        {
          $inc: {
            token: scoreChange,
          },
        },
        {
          returnDocument: 'after',
        },
      );
    await db
      .collection(botTokenDocumentName)
      .updateOne({ name: robot.name }, { $inc: { token: -scoreChange } });
    // If this isn't a level up and the score is larger than 1 (tipping aka level 3)
    if (from && from.name && (scoreChange > 1 || scoreChange < -1)) {
      const fromSearch = from.slackId
        ? { slackId: from.slackId }
        : { name: from.name };
      await db
        .collection(scores.scoresDocumentName)
        .updateOne(fromSearch, { $inc: { token: -scoreChange } });
    }
    return result.value;
  }

  async getMagicSecretStringNumberValue(robot) {
    const db = await this.getDb();
    const updateBotWallet = await db
      .collection(botTokenDocumentName)
      .findOne({ name: robot.name });
    return updateBotWallet.magicString;
  }
}

const databaseService = new DatabaseService();

module.exports = databaseService;
module.exports.dbs = databaseService;
