// Description:
//  Handles token transfers between users
//
// Commands:
//  @hubot hot wallet - displays info for hubot's 'hot wallet'
//  @hubot level up my account - moves the user's account up 1 level (e.g. 1->2) to allow them to start receiving crypto
//
// Author:
//  O'Mutt (Matt@OKeefe.dev)

const RegExpPlusPlus = require('../lib/RegExpPlusPlus');
const ScoreKeeper = require('../lib/services/scorekeeper');
const Helpers = require('../lib/Helpers');

module.exports = function tokens(robot) {
  const procVars = Helpers.getProcessVariables(process.env);
  const scoreKeeper = new ScoreKeeper({ robot, ...procVars });

  // listen for bot tag/ping
  robot.respond(RegExpPlusPlus.createGiveTokenRegExp(), giveTokenBetweenUsers);

  /**
   * Sends a token between one user to another user
   * @param {object} msg - hubot message object
   * @returns {Promise<void>}
   */
  async function giveTokenBetweenUsers(msg) {
    const [fullText, premessage, name, number, conjunction, reason] = msg.match;
    if (!conjunction && reason) {
      // circuit break a plus plus
      robot.emit('plus-plus-failure', {
        notificationMessage: `False positive detected in <#${msg.message.room}> from <@${msg.message.user.id}>:\nPre-Message text: [${!!premessage}].\nMissing Conjunction: [${!!(!conjunction && reason)}]\n\n${fullText}`,
        room: msg.message.room,
      });
      return;
    }
    const { room, mentions } = msg.message;
    const cleanName = Helpers.cleanName(name);
    let to = { name: cleanName };
    if (mentions) {
      if (mentions.filter((men) => men.type === 'user').length > 1) {
        // shift off the first mention (most likely @qrafty)
        robot.logger.debug('We are shifting off the first mention', mentions.filter((men) => men.type === 'user'));
        mentions.filter((men) => men.type === 'user').shift();
      }
      to = mentions.filter((men) => men.type === 'user').shift();
      to.name = cleanName;
    }
    const cleanReason = Helpers.cleanAndEncode(reason);
    const from = msg.message.user;

    robot.logger.debug(`${number} score for [${mentions}] from [${from}]${cleanReason ? ` because ${cleanReason}` : ''} in [${room}]`);
    let response;
    try {
      response = await scoreKeeper.transferTokens(to, from, room, cleanReason, number);
    } catch (e) {
      msg.send(e.message);
      return;
    }

    const message = Helpers.getMessageForTokenTransfer(robot,
      response.toUser,
      response.fromUser,
      number,
      cleanReason);

    if (message) {
      msg.send(message);
      robot.emit('plus-plus', {
        notificationMessage: `<@${response.fromUser.slackId}> sent ${number} ${Helpers.capitalizeFirstLetter(robot.name)} point${parseInt(number, 10) > 1 ? 's' : ''} to <@${response.toUser.slackId}> in <#${room}>`,
        recipient: response.toUser,
        sender: response.fromUser,
        direction: '++',
        amount: number,
        room,
        reason: cleanReason,
        msg,
      });
    }
  }
};
