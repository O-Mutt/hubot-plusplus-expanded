/* eslint-disable no-restricted-syntax */
const { MongoClient } = require('mongodb');
const moment = require('moment');
const { scoresDocumentName, createNewLevelOneUser } = require('../data/scores');
const logDocumentName = require('../data/scoreLog');
const botTokenDocumentName = require('../data/botToken');
const helpers = require('../helpers');

class DatabaseService {
  constructor(params) {
    this.db = undefined;
    this.robot = params.robot;
    this.uri = params.mongoUri;
    this.furtherFeedbackScore = params.furtherFeedbackSuggestedScore;
    this.peerFeedbackUrl = params.peerFeedbackUrl;
    this.spamTimeLimit = params.spamTimeLimit;
  }

  async init() {
    const client = new MongoClient(this.uri,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    const connection = await client.connect();
    this.db = connection.db();
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
  async getUser(user) {
    this.robot.logger.debug(`trying to find user ${user}`);
    const db = await this.getDb();
    const dbUser = await db.collection(scoresDocumentName).findOne(
      { name: user },
      { sort: { score: -1 } },
    );

    if (!dbUser) {
      const newUser = createNewLevelOneUser(user, this.robot.name);
      return newUser;
    }
    return dbUser;
  }

  async saveUser(user, from, room, reason) {
    const db = await this.getDb();

    const result = await db.collection(scoresDocumentName)
      .findOneAndUpdate(
        { name: user.name },
        {
          $set: user,
        },
        {
          returnOriginal: false,
          upsert: true,
          sort: { score: -1 },
        },
      );

    let updatedUser = result.value;
    if (updatedUser.accountLevel > 1) {
      updatedUser = await this.transferScoreFromBotToUser(user.name);
    }

    try {
      this.savePlusPlusLog(user, from, room, reason);
    } catch (e) {
      this.robot.logger.error(`failed saving spam log for user ${user.name} from ${from.name} in room ${room} because ${reason}`, e);
    }

    this.robot.logger.debug(`Saving user original: [${user.name}: ${user.score} ${user.reasons[reason] || 'none'}], new [${updatedUser.name}: ${updatedUser.score} ${updatedUser.reasons[reason] || 'none'}]`);

    return updatedUser;
  }

  async savePlusPlusLog(user, from, room, reason) {
    const db = await this.getDb();
    await db.collection(logDocumentName).insertOne({
      from: from.name,
      to: user.name,
      date: moment().toISOString(),
      room,
      reason,
    });
  }

  async isSpam(to, from) {
    this.robot.logger.debug('spam check');
    const db = await this.getDb();
    let fiveMinutesAgo = moment();
    fiveMinutesAgo = fiveMinutesAgo.subtract(this.spamTimeLimit, 'minutes').toISOString();
    const previousScoreExists = await db.collection(logDocumentName)
      .countDocuments({
        from,
        to,
        date: { $gte: fiveMinutesAgo },
      });
    this.robot.logger.debug('spam check result', previousScoreExists);
    if (previousScoreExists !== 0) {
      this.robot.logger.error(`${from.name} is spamming points to ${to}! STOP THEM!!!!`);
      return true;
    }

    return false;
  }

  /*
  * from - database user who is sending the score
  * to - database user who is receiving the score
  * score - the number of score that is being sent
  */
  async savePointsGiven(from, to, score) {
    const db = await this.getDb();
    const cleanName = helpers.cleanAndEncode(to.name);
    const fromUser = await this.getUser(from.name);

    const oldScore = fromUser.pointsGiven[cleanName] ? fromUser.pointsGiven[cleanName] : 0;
    fromUser.pointsGiven[cleanName] = (oldScore + score);
    const result = await db.collection(scoresDocumentName)
      .findOneAndUpdate(
        { name: fromUser.name },
        { $set: fromUser },
        {
          returnOriginal: false,
          upsert: true,
          sort: { score: -1 },
        },
      );
    const updatedUser = result.value;

    if (updatedUser.pointsGiven[cleanName] % this.furtherFeedbackScore === 0 && score === 1) {
      this.robot.logger.debug(`${from.name} has sent a lot of points to ${to.name} suggesting further feedback`);
      this.robot.messageRoom(from.id, `Looks like you've given ${to.name} quite a few points, maybe you should look at submitting ${this.peerFeedbackUrl}`);
    }
  }

  async getTopScores(amount) {
    const db = await this.getDb();
    const results = await db.collection(scoresDocumentName)
      .find()
      .sort({ score: -1 })
      .limit(amount)
      .toArray();

    this.robot.logger.debug('Trying to find top scores');

    return results;
  }

  async getBottomScores(amount) {
    const db = await this.getDb();
    const results = await db.collection(scoresDocumentName)
      .find({ score: { $gt: Number.MIN_SAFE_INTEGER } })
      .sort({ score: 1 })
      .limit(amount)
      .toArray();

    this.robot.logger.debug('Trying to find bottom scores');

    return results;
  }

  async getTopTokens(amount) {
    const db = await this.getDb();
    const results = await db.collection(scoresDocumentName)
      .find({
        accountLevel: { $gte: 2 },
      })
      .sort({ token: -1 })
      .limit(amount)
      .toArray();

    this.robot.logger.debug('Trying to find top tokens');

    return results;
  }

  async getBottomTokens(amount) {
    const db = await this.getDb();
    const results = await db.collection(scoresDocumentName)
      .find({
        accountLevel: { $gte: 2 },
      })
      .sort({ token: 1 })
      .limit(amount)
      .toArray();

    this.robot.logger.debug('Trying to find top tokens');

    return results;
  }

  async erase(username, reason) {
    const db = await this.getDb();
    let result;
    if (reason) {
      const oldUser = await db.collection(scoresDocumentName).findOne({ name: username });
      const newScore = oldUser.score - oldUser.reasons[reason];
      result = await db.collection(scoresDocumentName)
        .updateOne({ name: username }, { $set: { score: newScore, reasons: { [`${reason}`]: 0 } } });
    } else {
      result = await db.collection(scoresDocumentName)
        .deleteOne({ name: username }, { $set: { score: 0 } });
    }

    return result;
  }

  async updateAccountLevelToTwo(user) {
    const db = await this.getDb();
    let tokensAdded = 0;
    await db.collection(scoresDocumentName).find({ name: user.name }).forEach((mappedUser) => {
      // we are leveling up from 0 (which is level 1) -> 2 or 2 -> 3
      if (mappedUser.accountLevel && mappedUser.accountLevel === 2) {
        // this is a weird case and shouldn't really happen... not sure about this...
        this.robot.logger.debug(`Somehow FoundUser[${mappedUser.name}] SearchedUser[${user.name}] was trying to upgrade their account to level 2.`);
        return;
      }
      mappedUser.accountLevel = 2;
      mappedUser.token = 0;
      tokensAdded = mappedUser.score;
      db.collection(scoresDocumentName).save(mappedUser);
    });

    await this.transferScoreFromBotToUser(user.name, tokensAdded);
    return true;
  }

  async getBotWallet() {
    const db = await this.getDb();
    const botWallet = await db.collection(botTokenDocumentName).findOne({ name: this.robot.name });
    return botWallet;
  }

  async transferScoreFromBotToUser(userName, scoreChange = 1) {
    const db = await this.getDb();
    this.robot.logger.info(`We are transferring ${scoreChange} ${helpers.capitalizeFirstLetter(this.robot.name)} Tokens to ${userName}`);
    const result = await db.collection(scoresDocumentName).findOneAndUpdate({ name: userName }, { $inc: { token: scoreChange } }, { returnOriginal: false });
    const updateBotWallet = await db.collection(botTokenDocumentName).updateOne({ name: this.robot.name }, { $inc: { token: -scoreChange } });
    return result.value;
  }

  async getMagicSecretStringNumberValue() {
    const db = await this.getDb();
    const updateBotWallet = await db.collection(botTokenDocumentName).findOne({ name: this.robot.name });
    return updateBotWallet.magicString;
  }
}

module.exports = DatabaseService;
