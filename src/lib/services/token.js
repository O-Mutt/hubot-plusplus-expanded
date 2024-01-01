const ScoreKeeperService = require('./scorekeeper');
const { H } = require('../helpers');

class TokenService {
  /**
   * Sends a token between one user to another user
   * @param {object} msg - hubot message object
   * @returns {Promise<void>}
   */
  static async giveTokenBetweenUsers(msg) {
    const [fullText, premessage, name, number, conjunction, reason] = msg.match;
    if (!conjunction && reason) {
      // circuit break a plus plus
      msg.robot.emit('plus-plus-failure', {
        notificationMessage: `False positive detected in <#${
          msg.message.room
        }> from <@${
          msg.message.user.id
        }>:\nPre-Message text: [${!!premessage}].\nMissing Conjunction: [${!!(
          !conjunction && reason
        )}]\n\n${fullText}`,
        room: msg.message.room,
      });
      return;
    }
    const { room, mentions } = msg.message;
    const cleanName = H.cleanName(name);
    let to = { name: cleanName };
    if (mentions) {
      if (mentions.filter((men) => men.type === 'user').length > 1) {
        // shift off the first mention (most likely @qrafty)
        msg.robot.logger.debug(
          'We are shifting off the first mention',
          mentions.filter((men) => men.type === 'user'),
        );
        mentions.filter((men) => men.type === 'user').shift();
      }
      to = mentions.filter((men) => men.type === 'user').shift();
      to.name = cleanName;
    }
    const cleanReason = H.cleanAndEncode(reason);
    const from = msg.message.user;

    msg.robot.logger.debug(
      `${number} score for [${mentions}] from [${from}]${
        cleanReason ? ` because ${cleanReason}` : ''
      } in [${room}]`,
    );
    let response;
    try {
      response = await ScoreKeeperService.transferTokens(
        msg.robot,
        to,
        from,
        room,
        cleanReason,
        number,
      );
    } catch (e) {
      msg.send(e.message);
      return;
    }

    const message = H.getMessageForTokenTransfer(
      msg.robot,
      response.toUser,
      response.fromUser,
      number,
      cleanReason,
    );

    if (message) {
      msg.send(message);
      msg.robot.emit('plus-plus', {
        notificationMessage: `<@${
          response.fromUser.slackId
        }> sent ${number} ${H.capitalizeFirstLetter(msg.robot.name)} point${
          parseInt(number, 10) > 1 ? 's' : ''
        } to <@${response.toUser.slackId}> in <#${room}>`,
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
}

module.exports = TokenService;
module.exports.tss = TokenService;
