/*
 * Scores Object
 * --------------------------------
 * id: ObjectId
 * name: string
 * pointsGiven: PointsGivenObject
 * score: Int32
 * token: Int32
 * accountLevel: Int32
 * <botName>Day: Date
 * reasons: ReasonsObject
 * --------------------------------
 *
 * ReasonsObject:
 * {
 *   [string]: int
 * }
 *
 * PointsGivenObject:
 * {
 *   [encryptedString]: int
 * }
 */
const scoresDocumentName = 'scores';

const createNewLevelOneUser = (user, robotName) => {
  const userName = user.name ? user.name : user;

  const newUser = {
    name: userName,
    score: 0,
    reasons: { },
    pointsGiven: { },
    [`${robotName}Day`]: new Date(),
    accountLevel: 1,
  };
  if (user.id) {
    newUser.slackId = user.id;
  }
  if (user.profile && user.profile.email) {
    newUser.slackEmail = user.profile.email;
  } else if (user.info && user.info.email_address) {
    newUser.slackEmail = user.info.email_address;
  }
  return newUser;
};

module.exports = { scoresDocumentName, createNewLevelOneUser };
