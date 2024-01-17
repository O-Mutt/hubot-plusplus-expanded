const Conversation = require('hubot-conversation');
const tokenBuddy = require('token-buddy');
const _ = require('lodash');
const { dbs } = require('./database');
const { H } = require('../helpers');

class WalletService {
  static async levelUpAccount(msg) {
    const capRobotName = H.capitalizeFirstLetter(msg.robot.name);
    const switchBoard = new Conversation(msg.robot);
    const dialog = switchBoard.startDialog(msg);
    dialog.dialogTimeout = async (timeoutMsg) => {
      await timeoutMsg.reply(
        "You didn't answer the question prompted in a timely fashion, this message will now self destruct. :boom:",
      );
    };

    if (!H.isPrivateMessage(msg.message.room)) {
      await msg.reply(
        `You should only execute a level up from within the context of a DM with ${msg.robot.name}`,
      );
      return false;
    }

    const user = await dbs.getUser(msg.robot, msg.message.user);
    if (user.accountLevel === 2) {
      await msg.reply(
        `You are already Level 2, ${user.name}. It looks as if you are ready for Level 3 where you can deposit/withdraw ${capRobotName} Tokens! Is that correct? [Yes/No]`,
      );
      dialog.addChoice(/yes/i, (msg2) => {
        // do the level 3 step up, get their info for deposit withdrawal
        msg2.reply(
          `Hey ${user.name}, looks like you are ready for Level 3 but I'm not :sob:. Level 3 is still WIP and will be available very soon!`,
        );
      });
      dialog.addChoice(/no/i, (msg2) => {
        msg2.reply('Woops. My mistake. Carry on++');
      });
      return false;
    }

    const leveledUpUser = await dbs.updateAccountLevelToTwo(msg.robot, user);
    msg.robot.logger.debug('DB results', leveledUpUser);

    await msg.reply(
      `${user.name}, we are going to level up your account to Level 2! This means you will start getting ${capRobotName} Tokens as well as points!`,
    );
    return true;
  }

  static async botWalletCount(msg) {
    const capRobotName = H.capitalizeFirstLetter(msg.robot.name);
    const botWallet = await dbs.getBotWallet(msg.robot);
    msg.robot.logger.debug(
      `Get the bot wallet by user ${msg.message.user.name}, ${botWallet}`,
    );
    let gas;
    try {
      gas = await tokenBuddy.getBalance(botWallet.publicWalletAddress);
    } catch (e) {
      await msg.send(
        `An error occurred getting ${msg.robot.name}'s gas amount`,
      );
    }
    msg.robot.logger.debug(
      `Get the bot wallet by user ${msg.message.user.name}, ${_.pick(
        JSON.stringify(botWallet),
        ['publicWalletAddress', 'name', 'token'],
      )}`,
    );

    const message = {
      attachments: [
        {
          color: '#FEA500',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${capRobotName} Token Wallet Info:`,
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
        },
      ],
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

    await msg.send(message);
  }
}

module.exports = WalletService;
module.exports.ws = WalletService;
