const SlackClient = require('@slack/client');
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

function getEmail(user) {
  if (user.profile && user.profile.email) {
    return user.profile.email;
  } else if (user.info && user.info.email_address) {
    return user.info.email_address;
  }
  return undefined;
}

async function createNewLevelOneUser(createUser, robot) {
  const userName = createUser.name ? createUser.name : createUser;

  const newUser = {
    name: userName,
    score: 0,
    reasons: { },
    pointsGiven: { },
    [`${robot.name}Day`]: new Date(),
    accountLevel: 1,
    totalPointsGiven: 0,
  };
  if (createUser.id) {
    newUser.slackId = createUser.id;
  }
  newUser.slackEmail = getEmail(createUser);

  if (newUser.slackId && !newUser.slackEmail && robot.adapter && robot.adapter.options && robot.adapter.options.token) {
    const web = new SlackClient.WebClient(robot.adapter.options.token);
    const result = await web.users.info({ user: newUser.slackId });
    newUser.slackEmail = getEmail(result.user);
  }

  return newUser;
}

module.exports = { scoresDocumentName, createNewLevelOneUser };
