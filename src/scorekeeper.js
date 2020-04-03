const { MongoClient } = require('mongodb');
const helpers = require('./helpers');

/*
 * scores: []
 * {
 *   name: string
 *   score: int
 *   reasons: ReasonsObject
 *   pointsGiven: PointsGivenObject
 * }
 *
 * ReasonsObject:
 * {
 *   [reason]: int
 * }
 *
 * PointsGivenObject:
 * {
 *   [to]: int
 * }
 */
const scoresDocumentName = 'scores';

/*
 * scoreLog: []
 * {
 *   from: string
 *   to: string
 *   date: datetime
 * }
 */
const logDocumentName = 'scoreLog';

class ScoreKeeper {
  constructor(robot, uri, peerFeedbackUrl, spamMessage, furtherFeedbackScore = 10) {
    this.uri = uri;
    this.robot = robot;
    this.peerFeedbackUrl = peerFeedbackUrl;
    this.furtherFeedbackScore = parseInt(furtherFeedbackScore, 10);
    this.spamMessage = spamMessage;
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

  async getUser(user) {
    this.robot.logger.debug(`trying to find user ${user}`);
    const db = await this.getDb();
    const dbUser = await db.collection(scoresDocumentName).findOneAndUpdate(
      { name: user },
      {
        $setOnInsert: {
          name: user,
          score: 0,
          reasons: {},
          pointsGiven: {},
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
        { $inc: incrementObject },
        {
          returnOriginal: false,
          upsert: true,
          sort: { score: -1 },
        },
      );
    const updatedUser = result.value;

    try {
      this.saveSpamLog(user.name, from.name, room, reason);
    } catch (e) {
      this.robot.logger.warn(`failed saving spam log for user ${user.name} from ${from.name} in room ${room} because ${reason}`, e);
      // ignore
    }
    this.robot.logger.debug(`Saving user original: [${user.name}: ${user.score} ${user.reasons[reason] || 'none'}], new [${updatedUser.name}: ${updatedUser.score} ${updatedUser.reasons[reason] || 'none'}]`);

    return [updatedUser.score, updatedUser.reasons[reason] || 'none'];
  }

  async add(user, from, room, reason) {
    const toUser = await this.getUser(user);
    if (await this.validate(toUser, from)) {
      let incScoreObj = { score: 1 };
      if (reason) {
        incScoreObj = {
          score: 1,
          [`reasons.${reason}`]: 1,
        };
      }

      await this.savePointsGiven(from, toUser.name, 1);
      return this.saveUser(toUser, from, room, reason, incScoreObj);
    }
    return [null, null];
  }

  async subtract(user, from, room, reason) {
    const toUser = await this.getUser(user);
    if (await this.validate(toUser, from)) {
      let decScoreObj = { score: -1 };
      if (reason) {
        decScoreObj = {
          score: -1,
          [`reasons.${reason}`]: -1,
        };
      }

      await this.savePointsGiven(from, toUser.name, -1);
      return this.saveUser(toUser, from, room, reason, decScoreObj);
    }
    return [null, null];
  }

  async erase(user, from, room, reason) {
    const dbUser = await this.getUser(user);
    const db = await this.getDb();

    if (reason) {
      await db.collection(scoresDocumentName)
        .drop({ name: [dbUser], reasons: [reason] }, { justOne: true });
      return true;
    }
    await db.collection(scoresDocumentName)
      .drop({ name: [user] });
    return true;
  }

  async scoreForUser(user) {
    const dbUser = await this.getUser(user);
    return dbUser.score;
  }

  async reasonsForUser(user) {
    const dbUser = await this.getUser(user);
    return dbUser.reasons;
  }

  async saveSpamLog(user, fromUser) {
    const db = await this.getDb();
    db.collection(logDocumentName).insertOne({
      from: fromUser,
      to: user,
      date: new Date(),
    });
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
      this.robot.messageRoom(from.id, `Looks like you've given ${to} quite a few points, maybe you should look at submitting a ${this.peerFeedbackUrl}`);
    }
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
      this.robot.logger.debug(`${from.name} is spamming points to ${user}! STOP THEM!!!!`);
      this.robot.messageRoom(from.id, this.spamMessage);
      return true;
    }

    return false;
  }

  async validate(user, from) {
    return (user.name !== from.name) && !await this.isSpam(user.name, from);
  }

  async top(amount) {
    const db = await this.getDb();
    const results = await db.collection(scoresDocumentName)
      .find()
      .sort({ score: -1 })
      .limit(amount)
      .toArray();

    this.robot.logger.debug('Trying to find top scores');

    return results;
  }

  async bottom(amount) {
    const db = await this.getDb();
    const results = await db.collection(scoresDocumentName)
      .find({})
      .sort({ score: 1 })
      .limit(amount)
      .toArray();

    this.robot.logger.debug('Trying to find top scores');

    return results;
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
