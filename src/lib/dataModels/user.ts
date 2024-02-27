import { UsersInfoResponse, WebClient } from '@slack/web-api';
import { ObjectId } from 'mongodb';

export const SCORES_DOCUMENT_NAME = 'scores';

export interface User {
  id: ObjectId;
  name: string;
  pointsGiven: { [key: string]: number };
  score: number;
  token: number;
  accountLevel: 1 | 2 | 3;
  // <botName>Day: Date;
  reasons: { [key: string]: number };
  [key: string]: any;
}

function getEmail(user: UsersInfoResponse['user']): string | undefined {
  return user?.profile?.email ?? undefined;
}

export async function createNewLevelOneUser(createUser, robot) {
  const userName = createUser.name ? createUser.name : createUser;

  const newUser: User = {
    id: new ObjectId(),
    name: userName,
    score: 0,
    reasons: {},
    pointsGiven: {},
    [`${robot.name}Day`]: new Date(),
    accountLevel: 1,
    totalPointsGiven: 0,
    token: 0,
  };
  if (createUser.id) {
    newUser.slackId = createUser.id;
  }
  newUser.slackEmail = getEmail(createUser);

  if (
    newUser.slackId &&
    !newUser.slackEmail &&
    robot.adapter &&
    robot.adapter.options &&
    robot.adapter.options.token
  ) {
    const web = new WebClient(robot.adapter.options.token);
    const result = await web.users.info({ user: newUser.slackId });
    newUser.slackEmail = getEmail(result.user);
  }

  return newUser;
}
