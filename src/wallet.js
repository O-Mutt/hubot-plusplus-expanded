const Conversation = require('hubot-conversation');
const helpers = require('./helpers');

async function levelUpAccount(msg, scoreKeeper) {
  const switchBoard = new Conversation(msg.robot);
  const dialog = switchBoard.startDialog(msg);

  if (helpers.isNotPrivateMessage(msg)) {
    return msg.reply(`You should only execute a level up from within the context of a DM with ${msg.robot.name}`);
  }

  const user = await scoreKeeper.databaseService.getUser();
  if (user.accountLevel === 2) {
    // do the level 3 step up, get their info for deposit withdrawal
    return false;
  }

  const leveledUpUser = await scoreKeeper.databaseService.levelUpAccount(user);
  msg.robot.logger.debug('DB results', leveledUpUser);
  msg.reply(`${user.name}, we are going to level up your account to Level 2! This means you will start getting ${msg.robot.name} Tokens as well as points!`);
  return true;
}

module.exports = {
  levelUpAccount,
};
