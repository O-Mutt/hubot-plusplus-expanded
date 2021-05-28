const Conversation = require('hubot-conversation');
const tokenBuddy = require('token-buddy');
const helpers = require('./helpers');
// this may need to move or be generic...er
const token = require('./token');
const decrypt = require('./services/decrypt');

async function levelUpAccount(msg, scoreKeeper) {
  const switchBoard = new Conversation(msg.robot);
  const dialog = switchBoard.startDialog(msg);
  dialog.dialogTimeout = (timeoutMsg) => {
    timeoutMsg.reply('You didn\'t answer the question prompted in a timely fashion, this message will now self destruct. :boom:');
  };

  if (helpers.isNotPrivateMessage(msg)) {
    return msg.reply(`You should only execute a level up from within the context of a DM with ${msg.robot.name}`);
  }

  const user = await scoreKeeper.databaseService.getUser(msg.message.user.name);
  if (user.accountLevel === 2) {
    msg.reply(`You are already Level 2, ${user.name}. It looks as if you are ready for Level 3 where you can deposit/withdraw ${helpers.capitalizeFirstLetter(msg.robot.name)} Tokens! Is that correct? [Yes/No]`);
    dialog.addChoice(/yes/i, (msg2) => {
      // do the level 3 step up, get their info for deposit withdrawal
      msg2.reply(`Hey ${user.name}, looks like you are ready for Level 3 but I'm not :sob:. Level 3 is still WIP and will be available very soon!`);
    });
    dialog.addChoice(/no/i, (msg2) => {
      msg2.reply('Woops. My mistake. Carry on++');
    });
    return false;
  }

  const leveledUpUser = await scoreKeeper.databaseService.updateAccountLevelToTwo(user);
  msg.robot.logger.debug('DB results', leveledUpUser);
  msg.reply(`${user.name}, we are going to level up your account to Level 2! This means you will start getting ${helpers.capitalizeFirstLetter(msg.robot.name)} Tokens as well as points!`);
  return true;
}

async function botWalletCount(msg, scoreKeeper) {
  const botWallet = await scoreKeeper.databaseService.getBotWallet();
  const gas = await tokenBuddy.getBalance(botWallet.publicWalletAddress);
  msg.robot.logger.debug(`Get the bot wallet by user ${msg.message.user.name}`);

  const message = {
    attachments: [{
      color: '#FEA500',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${helpers.capitalizeFirstLetter(msg.robot.name)} Token Wallet Info:`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Public Wallet Address: ${botWallet.publicWalletAddress}\n`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Tokens In Wallet: ${botWallet.token.toLocaleString()}\n`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Gas Available: ${gas.toLocaleString()}\n`,
          },
        },
      ],
    }],
  };

  return msg.send(message);
}

module.exports = {
  levelUpAccount,
  botWalletCount,
};
