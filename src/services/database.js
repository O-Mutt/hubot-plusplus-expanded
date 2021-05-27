/* eslint-disable no-restricted-syntax */
const { MongoClient } = require('mongodb');
const scoresDocumentName = require('../data/scores');
const logDocumentName = require('../data/scores');
const botTokenDocumentName = require('../data/botToken');
const helpers = require('../helpers');

class DatabaseService {
  constructor(params) {
    this.db = undefined;
    this.robot = params.robot;
    this.uri = params.mongoUri;
    this.furtherFeedbackScore = params.furtherFeedbackSuggestedScore;
    this.peerFeedbackUrl = params.peerFeedbackUrl;
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
    const dbUser = await db.collection(scoresDocumentName).findOneAndUpdate(
      { name: user },
      {
        $setOnInsert: {
          name: user,
          score: 0,
          reasons: { },
          pointsGiven: { },
          [`${this.robot.name}Day`]: new Date(),
        },
      },
      {
        returnOriginal: false,
        upsert: true,
        sort: { score: -1 },
      },
    );

    return dbUser.value;
  }

  async saveUser(user, from, room, reason, incrementObject) {
    const db = await this.getDb();

    const result = await db.collection(scoresDocumentName)
      .findOneAndUpdate(
        { name: user.name },
        {
          $inc: incrementObject,
        },
        {
          returnOriginal: false,
          upsert: true,
          sort: { score: -1 },
        },
      );
    const updatedUser = result.value;
    await this.updateBotWallet(incrementObject.score);

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
      date: new Date(),
    });
  }

  async isSpam(user, from) {
    this.robot.logger.debug('spam check');
    const db = await this.getDb();
    const previousScoreExists = await db.collection(logDocumentName)
      .find({
        from: from.name,
        to: user,
      }).count(true);
    this.robot.logger.debug('spam check result', previousScoreExists);
    if (previousScoreExists) {
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

  async levelUpAccount(user) {
    const db = await this.getDb();
    let tokensAdded = 0;
    await db.collection(scoresDocumentName).find({ name: user.name }).map(async (mappedUser) => {
      // we are leveling up from 0 (which is level 1) -> 2 or 2 -> 3
      const newLevel = !mappedUser.accountLevel ? 2 : 3;
      mappedUser.accountLevel = newLevel;
      mappedUser.token = mappedUser.score;
      tokensAdded += mappedUser.score;
      await db.collection(scoresDocumentName).save(mappedUser);
    });

    await this.updateBotWallet(-tokensAdded);
    return true;
  }

  async updateBotWallet(scoreChange) {
    const updatedBotToken = await this.db.collection(botTokenDocumentName).updateOne({ name: this.robot.name }, { $inc: { tokens: scoreChange } });
    return updatedBotToken;
  }
}

module.exports = DatabaseService;
