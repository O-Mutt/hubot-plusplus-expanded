const MongoClient = require('mongodb').MongoClient;
const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/plusPlus';
const client = new MongoClient(mongoUri);
const scoresDocumentName = 'scores';
const logDocumentName = 'scoreLog';

class ScoreKeeper {
  constructor(robot) {
    this.db;
    this.robot = robot;
    client.connect((err) => {
      if (!err) {
        this.db = client.db();
      } else {
        this.robot.logger.debug(`Error connecting to mongo ${err}`);
        process.exit();
      }
    });
  }


  async getUser(user) {
    this.robot.logger.debug(`trying to find user ${user}`);
    const dbUser = await this.db.collection(scoresDocumentName).findOneAndUpdate(
      { 'name': user },
      {
        $setOnInsert: {
          name: user,
          score: 0,
          reasons: {}
        }
      }, 
      { 
        returnOriginal: false,
        upsert: true 
      });
    this.robot.logger.debug(`findOneAndUpdate found: ${JSON.stringify(dbUser.value)}`);
    /*if (!dbUser) {
      dbUser = {
        scores: 0,
        reasons: {}
      };
    }*/
    
    return dbUser.value;
  }

  async saveUser(user, from, room, reason, incrementObject) {
    const result = await this.db.collection(scoresDocumentName)
      .findOneAndUpdate(
        { 'name': user.name }, 
        { $inc: incrementObject }, 
        { returnOriginal: false, upsert: true });
    const updatedUser = result.value;

    this.saveScoreLog(user.name, from, room, reason);
    
    this.robot.logger.debug(`Saving user original: [${user.name}: ${user.score}], new [${updatedUser.name}: ${updatedUser.score}]`);

    return [ updatedUser.score, updatedUser.reasons[reason] || "none" ];
  }

  async add(user, from, room, reason) {
    user = await this.getUser(user);
    if (await this.validate(user, from)) {
      
      let incScoreObj = { score: 1 };
      if (reason) {
        incScoreObj = {
          score: 1,
          reasons: {
            [reason]: 1
          }
        };
      }

      return await this.saveUser(user, from, room, reason, incScoreObj);
    } else {
      return [null, null];
    }
  }

  async subtract(user, from, room, reason) {
    user = await this.getUser(user);
    if (await this.validate(user, from)) {
      
      let decScoreObj = { score: -1 };
      if (reason) {
        decScoreObj = {
          score: -1,
          reasons: {
            [reason]: -1
          }
        };
      }

      return await this.saveUser(user, from, room, reason, decScoreObj);
    } else {
      return [null, null];
    }
  }

  async erase(user, from, room, reason) {
    user = await this.getUser(user);

    if (reason) {
      //delete this.storage.reasons[user][reason];
      //this.saveUser(user, from.name, room);
      return true;
    } else {
      //delete this.storage.scores[user];
      //delete this.storage.reasons[user];
      return true;
    }

    return false;
  }

  async scoreForUser(user) {
    user = await this.getUser(user);
    return user.score;
  }

  async reasonsForUser(user) {
    user = await this.getUser(user);
    return user.reasons;
  }

  saveScoreLog(user, from, room, reason) {
    this.db.collection(logDocumentName).insert({
      'from': from,
      'to': user,
      'date': new Date()
    });
  }

  last(room) {
    /*const last = this.storage.last[room];
    if (typeof last === 'string') {
      return [last, ''];
    } else {
      return [last.user, last.reason];
    }*/
  }

  async isSpam(user, from) {
    this.robot.logger.debug(`spam check`);
    const previousScoreExists = await this.db.collection(logDocumentName)
      .find({
        'from': from,
        'to': user }).count(true);
    this.robot.logger.debug(`spam check result`, previousScoreExists);
    if (previousScoreExists) {
      this.robot.logger.debug(`spam check if true`, true);
      return true;
    }

    return false;
  }

  async validate(user, from) {
    return (user.name !== from) && !await this.isSpam(user.name, from);
  }

  async top(amount) {
    const results = await this.db.collection(scoresDocumentName)
      .find()
      .sort({ score: -1 })
      .limit(amount)
      .toArray();

    this.robot.logger.debug(`Trying to find top scores`);

    return results;
  }

  async bottom(amount) {
    const results = await this.db.collection(scoresDocumentName)
      .find({})
      .sort({ score: 1 })
      .limit(amount)
      .toArray();
    
    this.robot.logger.debug(`Trying to find top scores`);
    
    return results;
  }

  normalize(fn) {
    /*const scores = {};

    _.each(this.storage.scores, function(score, name) {
      scores[name] = fn(score);
      if (scores[name] === 0) { return delete scores[name]; }
    });

    this.storage.scores = scores;
    return this.robot.brain.save();*/
  }
}

module.exports = ScoreKeeper;