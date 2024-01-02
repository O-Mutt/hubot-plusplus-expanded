const mockDb = {
  scores: [
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
  ],
  scoreLog: [{}],
  botToken: [require('./mockBotToken.json')],
};

module.exports = mockDb;
