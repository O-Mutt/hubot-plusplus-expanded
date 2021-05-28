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

    const updatedUser = result.value;
    if (updatedUser.accountLevel > 1) {
      await this.transferScoreFromBotToUser(user.name);
    }

    try {
      this.saveSpamLog(user.name, from.name, room, reason);
    } catch (e) {
      this.robot.logger.warn(`failed saving spam log for user ${user.name} from ${from.name} in room ${room} because ${reason}`, e);
    }

    this.robot.logger.debug(`Saving user original: [${user.name}: ${user.score} ${user.reasons[reason] || 'none'}], new [${updatedUser.name}: ${updatedUser.score} ${updatedUser.reasons[reason] || 'none'}]`);

    return [updatedUser.score, updatedUser.reasons[reason] || 'none', updatedUser];
  }

  async saveSpamLog(user, fromUser) {
    const db = await this.getDb();
    await db.collection(logDocumentName).insertOne({
      from: fromUser,
      to: user,
      date: moment().toISOString(),
    });
  }

  async isSpam(user, from) {
    this.robot.logger.debug('spam check');
    const db = await this.getDb();
    let fiveMinutesAgo = moment();
    fiveMinutesAgo = fiveMinutesAgo.subtract(this.spamTimeLimit, 'minutes').toISOString();
    const previousScoreExists = await db.collection(logDocumentName)
      .countDocuments({
        from: from.name,
        to: user,
        date: { $gte: fiveMinutesAgo },
      });
    this.robot.logger.debug('spam check result', previousScoreExists);
    if (previousScoreExists !== 0) {
      this.robot.logger.warn(`${from.name} is spamming points to ${user}! STOP THEM!!!!`);
      return true;
    }

    return false;
  }

  async savePointsGiven(from, to, score) {
    const db = await this.getDb();
    const cleanName = helpers.cleanAndEncode(to);

    const incObject = { [`pointsGiven.${cleanName}`]: score };
    const result = await db.collection(scoresDocumentName)
      .findOneAndUpdate(
        { name: from.name },
        { $inc: incObject },
        {
          returnOriginal: false,
          upsert: true,
          sort: { score: -1 },
        },
      );
    const updatedUser = result.value;
    if (updatedUser.pointsGiven[cleanName] % this.furtherFeedbackScore === 0 && score === 1) {
      this.robot.logger.debug(`${from.name} has sent a lot of points to ${to} suggesting further feedback`);
      this.robot.messageRoom(from.id, `Looks like you've given ${to} quite a few points, maybe you should look at submitting ${this.peerFeedbackUrl}`);
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

  async erase(username, reason) {
    const db = await this.getDb();
    let result;
    if (reason) {
      result = await db.collection(scoresDocumentName)
        .drop({ name: [username], reasons: [reason] }, { justOne: true });
    } else {
      result = await db.collection(scoresDocumentName)
        .drop({ name: [username] });
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

  async transferScoreFromBotToUser(userName, scoreChange = 1) {
    this.robot.logger.info(`We are transferring ${scoreChange} ${helpers.capitalizeFirstLetter(this.robot.name)} Tokens to ${userName}`);
    const updateUser = await this.db.collection(scoresDocumentName).updateOne({ name: userName }, { $inc: { token: scoreChange } });
    const updateBotWallet = await this.db.collection(botTokenDocumentName).updateOne({ name: userName }, { $inc: { token: -scoreChange } });
    return updateUser;
  }
}

module.exports = DatabaseService;
