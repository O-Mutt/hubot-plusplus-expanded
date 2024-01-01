const mongoUnit = require('mongo-unit');
const { MongoClient } = require('mongodb');
const sinon = require('sinon');
const testData = require('./mockData');

// can be async or not
exports.mochaGlobalSetup = async function () {
  const url = await mongoUnit.start();
  const client = new MongoClient(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const connection = await client.connect();
  globalThis.db = connection.db();

  //stub the process.env pieces

  sinon.stub(process, 'env').value({
    ...process.env,
    MONGODB_URI: url,
    HUBOT_PEER_FEEDBACK_URL: `'Formal Praise' (company.formal-praise.com)`,
    HUBOT_SPAM_MESSAGE: 'Please slow your roll.',
    HUBOT_FURTHER_FEEDBACK_SCORE: 10,
    SPAM_TIME_LIMIT: 5,
  });
};

exports.mochaHooks = {
  beforeEach(done) {
    mongoUnit.load(testData).then(() => {
      done();
    });
  },

  afterEach(done) {
    mongoUnit.drop().then(() => {
      done();
    });
  },
};

exports.mochaGlobalTeardown = async function () {
  await mongoUnit.drop();
  await mongoUnit.stop();
};
