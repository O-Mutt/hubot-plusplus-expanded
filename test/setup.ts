const mongoUnit = require('mongo-unit');
const fs = require('fs/promises');

const { MongoClient } = require('mongodb');
const testData = require('./mockData');
const { mockSlackClient, mockHubot } = require('./test_helpers');

beforeAll(async () => {
  globalThis.testMongoPath = `./test/mongo-unit-tmp-${Math.floor(
    Math.random() * 9999,
  )}`;
  await mongoUnit.start({
    port: Math.floor(Math.random() * 10000) + 27017,
    dbpath: globalThis.testMongoPath,
  });
  const client = new MongoClient(mongoUnit.getUrl(), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const connection = await client.connect();
  globalThis.db = connection.db();
  await mongoUnit.load(testData);

  process.env.MONGODB_URI = mongoUnit.getUrl();
});

beforeEach(async () => {
  jest.resetAllMocks();
  jest.resetModules();
  mockSlackClient();
  globalThis.mockRobot = mockHubot();
  await mongoUnit.drop();
  await mongoUnit.load(testData);
  process.env.HUBOT_PEER_FEEDBACK_URL = `'Formal Praise' (company.formal-praise.com)`;
  process.env.HUBOT_SPAM_MESSAGE = 'Please slow your roll.';
  process.env.HUBOT_FURTHER_FEEDBACK_SCORE = '10';
  process.env.SPAM_TIME_LIMIT = '5';
});

afterEach(async () => {});

afterAll(async () => {
  await mongoUnit.stop();
  await fs.rm(globalThis.testMongoPath, { recursive: true });
});
