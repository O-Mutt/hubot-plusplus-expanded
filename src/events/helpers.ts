import { Response } from 'hubot';

export function getRoomStr(msg: Response) {
  if (!msg) {
    return 'Unknown Room';
  }
  return `<#${msg.message.room}>`;
}

export function getUserStr(user) {
  if (!user) {
    return 'Unknown User';
  }

  if (user.slackId) {
    return `<@${user.slackId}>`;
  }
  if (user.id) {
    return `<@${user.id}>`;
  }
  return user.name;
}
