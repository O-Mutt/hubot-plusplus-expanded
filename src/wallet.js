// Description:
//  Hubot crypto wallet. This is used to manage the users wallet within the hubot-plusplus-expanded module
//
// Commands:
//  @hubot hot wallet - displays info for hubot's 'hot wallet'
//  @hubot level up my account - moves the user's account up 1 level (e.g. 1->2) to allow them to start receiving crypto
//
// Author:
//  O'Mutt (Matt@OKeefe.dev)
const _ = require('lodash');
const Conversation = require('hubot-conversation');
const tokenBuddy = require('token-buddy');

const Helpers = require('./lib/Helpers');
const regExpCreator = require('./lib/regexpCreator');
const DatabaseService = require('./lib/services/database');

module.exports = (robot) => {
  const procVars = Helpers.getProcessVariables(process.env);
  const databaseService = new DatabaseService({ robot, ...procVars });

  // message @robot.name
  robot.respond(regExpCreator.getBotWallet(), botWalletCount);

  // DM only
  robot.respond(regExpCreator.createLevelUpAccount(), levelUpAccount);

  async function levelUpAccount(msg) {
    const switchBoard = new Conversation(msg.robot);
    const dialog = switchBoard.startDialog(msg);
    dialog.dialogTimeout = (timeoutMsg) => {
      timeoutMsg.reply('You didn\'t answer the question prompted in a timely fashion, this message will now self destruct. :boom:');
    };

    if (!Helpers.isPrivateMessage(msg.message.room)) {
      return msg.reply(`You should only execute a level up from within the context of a DM with ${msg.robot.name}`);
    }

    const user = await databaseService.getUser(msg.message.user);
    if (user.accountLevel === 2) {
      msg.reply(`You are already Level 2, ${user.name}. It looks as if you are ready for Level 3 where you can deposit/withdraw ${Helpers.capitalizeFirstLetter(msg.robot.name)} Tokens! Is that correct? [Yes/No]`);
      dialog.addChoice(/yes/i, (msg2) => {
        // do the level 3 step up, get their info for deposit withdrawal
        msg2.reply(`Hey ${user.name}, looks like you are ready for Level 3 but I'm not :sob:. Level 3 is still WIP and will be available very soon!`);
      });
      dialog.addChoice(/no/i, (msg2) => {
        msg2.reply('Woops. My mistake. Carry on++');
      });
      return false;
    }

    const leveledUpUser = await databaseService.updateAccountLevelToTwo(user);
    msg.robot.logger.debug('DB results', leveledUpUser);

    msg.reply(`${user.name}, we are going to level up your account to Level 2! This means you will start getting ${Helpers.capitalizeFirstLetter(msg.robot.name)} Tokens as well as points!`);
    return true;
  }

  async function botWalletCount(msg) {
    const botWallet = await databaseService.getBotWallet();
    msg.robot.logger.debug(`Get the bot wallet by user ${msg.message.user.name}, ${botWallet}`);
    let gas;
    try {
      gas = await tokenBuddy.getBalance(botWallet.publicWalletAddress);
    } catch (e) {
      msg.send(`An error occurred getting ${msg.robot.name}'s gas amount`);
    }
    msg.robot.logger.debug(`Get the bot wallet by user ${msg.message.user.name}, ${_.pick(JSON.stringify(botWallet), ['publicWalletAddress', 'name', 'token'])}`);

    const message = {
      attachments: [{
        color: '#FEA500',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${Helpers.capitalizeFirstLetter(msg.robot.name)} Token Wallet Info:`,
            },
          },
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Public Wallet Address: ${botWallet.publicWalletAddress}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Tokens In Wallet: ${botWallet.token.toLocaleString()}`,
            },
          },
        ],
      }],
    };
    if (gas) {
      message.attachments[0].blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Gas Available: ${gas.toLocaleString()}`,
        },
      });
    }

    return msg.send(message);
  }
};
