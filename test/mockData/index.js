const mockDb = { scores: [], scoreLog: [{}], botToken: [] };
mockDb.scores.push(
  require('./mockMinimalUser.json'),
  require('./mockFullUser.json'),
  require('./mockFullUserLevel2.json'),
  require('./mockMinimalUserLevel2.json'),
  require('./mockMultiUser1.json'),
  require('./mockMultiUser2.json'),
  require('./mockMultiUser3.json'),
  require('./mockMultiPeriodUser1.json'),
  require('./mockMultiPeriodUser2.json'),
  require('./mockMultiPeriodUser3.json'),
);
mockDb.botToken.push(require('./mockBotToken.json'));

module.exports = mockDb;
