/* eslint-disable */
db.scores.find({ slackId: { $exists: true } }).forEach((user) => {
  let total = 0;
  for (const key in user.pointsGiven) {
    total += parseInt(user.pointsGiven[key], 10);
  }
  db.scores.update({ _id: user._id }, { $set: { totalPointsGiven: total } });
});

const theDate = new Date(ISODate().getTime() - 7 * 24 * 60 * 60000);
db.scoreLog.distinct('from', { date: { $gt: new ISODate().getTime() - 7 * 24 * 60 * 60000 } }).forEach((fromUser) => {
  print(fromUser);
  // print(to + ", " + value + ": " + db[collection].count({[to]: value}))
});

db.scoreLog.aggregate([
  {
    $match: {
      date: { $gt: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString() },
    },
  },
  {
    $group: { _id: '$from', scoreChange: { $sum: '$scoreChange' } },
  }]);
