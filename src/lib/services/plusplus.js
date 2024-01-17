const { sks } = require('./scorekeeper');
const { H } = require('../helpers');
const { rpp } = require('../regExpPlusPlus');
const { mfs } = require('../messageFactory');
const { GeneratePlusPlusEventObject } = require('../../events/plusPlus');
const {
  GeneratePlusPlusFailureEventObject,
} = require('../../events/plusPlusFalsePositive');
const ReactionService = require('./reactionService');

class PlusPlusService {
  /**
   * Functions for responding to commands
   */
  static async upOrDownVote(msg) {
    const [
      _fullText,
      premessage,
      name,
      operator,
      conjunction,
      reason,
      silentFlag = false,
    ] = msg.match;

    if (H.isKnownFalsePositive(premessage, conjunction, reason, operator)) {
      // circuit break a plus plus
      msg.robot.emit(
        'plus-plus-failure',
        GeneratePlusPlusFailureEventObject({ msg }),
      );
      return;
    }
    const increment = operator.match(rpp.positiveOperators) ? 1 : -1;
    const { room, mentions } = msg.message;
    const cleanName = H.cleanName(name);
    let to = { name: cleanName };
    if (mentions) {
      to = mentions.filter((men) => men.type === 'user').shift();
      to.name = cleanName;
    }
    const cleanReason = H.cleanAndEncode(reason);
    const from = msg.message.user;
    msg.robot.logger.debug(
      `${increment} score for [${to.name}] from [${from}]${
        cleanReason ? ` because ${cleanReason}` : ''
      } in [${room}]`,
    );
    let toUser;
    let fromUser;
    try {
      ({ toUser, fromUser } = await sks.incrementScore(
        msg.robot,
        to,
        from,
        room,
        cleanReason,
        increment,
      ));
    } catch (e) {
      await msg.send(e.message);
      return;
    }
    const message = mfs.BuildNewScoreMessage(
      msg.robot,
      toUser,
      cleanReason,
      msg.robot.name,
    );

    if (message) {
      await ReactionService.addPlusPlusReaction(msg, silentFlag);
      if (!silentFlag) {
        await msg.send(message);
      }

      msg.robot.emit('plus-plus', [
        GeneratePlusPlusEventObject({
          msg,
          operator,
          fromUser,
          toUser,
          cleanReason,
          silent: silentFlag,
        }),
      ]);
    }
  }

  static async multipleUsersVote(msg) {
    const [
      _fullText,
      premessage,
      names,
      operator,
      conjunction,
      reason,
      silentFlag = false,
    ] = msg.match;
    if (!names) {
      return;
    }
    if (H.isKnownFalsePositive(premessage, conjunction, reason, operator)) {
      // circuit break a plus plus
      msg.robot.emit(
        'plus-plus-failure',
        GeneratePlusPlusFailureEventObject({ msg }),
      );
      return;
    }

    const namesArray = names
      .trim()
      .toLowerCase()
      .split(new RegExp(rpp.multiUserSeparator))
      .filter(Boolean);

    const cleanNames = namesArray
      // Parse names
      .map((name) => {
        const cleanedName = H.cleanName(name);
        return cleanedName;
      })
      // Remove empty ones: {,,,}++
      .filter((name) => !!name.length)
      // Remove duplicates: {user1,user1}++
      .filter((name, pos, self) => self.indexOf(name) === pos);

    const from = msg.message.user;
    const { room, mentions } = msg.message;
    let toList = cleanNames.map((cn) => ({ name: cn }));
    if (mentions) {
      toList = mentions
        .filter((men) => men.type === 'user')
        .filter(
          (single, index, allMentions) =>
            index === allMentions.findIndex((m) => m.id === single.id),
        );
    }
    const cleanReason = H.cleanAndEncode(reason);
    const increment = operator.match(rpp.positiveOperators) ? 1 : -1;

    if (cleanNames.length !== toList.length) {
      await msg.send(
        'We are having trouble mapping your multi-user plusplus. Please try again and only include @ mentions.',
      );
      return;
    }

    const incScorePromises = [];
    for (const oneTo of toList) {
      incScorePromises.push(
        sks.incrementScore(
          msg.robot,
          oneTo,
          from,
          room,
          cleanReason,
          increment,
        ),
      );
    }

    const settledPromises = await Promise.allSettled(incScorePromises);
    const pointEmits = [];
    const messages = [];
    for (const settled of settledPromises) {
      if (settled.status === 'rejected') {
        msg.robot.logger.error(`Failed to send point ${settled.reason}`);
      } else if (settled.status === 'fulfilled') {
        const { toUser, fromUser } = settled.value;
        if (toUser) {
          msg.robot.logger.debug(
            `clean names map [${toUser.name}]: ${toUser.score}, the reason ${toUser.reasons[cleanReason]}`,
          );
          messages.push(
            mfs.BuildNewScoreMessage(msg.robot, toUser, cleanReason),
          );

          pointEmits.push(
            GeneratePlusPlusEventObject({
              msg,
              operator,
              fromUser,
              toUser,
              cleanReason,
            }),
          );
        }
      }
    }
    msg.robot.emit('plus-plus', pointEmits);

    const deDupedMessages = messages.filter((message) => !!message); // de-dupe

    msg.robot.logger.debug(
      `These are the original messages \n ${deDupedMessages.join('\n')}\n\n`,
      `These are the de-duped messages \n ${deDupedMessages.join('\n')}`,
    );
    ReactionService.addPlusPlusReaction(msg, silentFlag);
    if (!silentFlag) {
      await msg.send(deDupedMessages.join('\n'));
    }
  }

  /**
   * Erase a user's score, only admin accessible
   * @param {Object} msg
   * @returns {Promise<void>}
   *
   */
  static async eraseUserScore(msg) {
    let erased;
    const [_fullText, _premessage, name, _conjunction, reason] = msg.match;
    const from = msg.message.user;
    const { user } = msg.envelope;
    const { room, mentions } = msg.message;

    const cleanReason = H.cleanAndEncode(reason);
    let to = mentions.filter((men) => men.type === 'user').shift();
    const cleanName = H.cleanName(name);
    if (!to) {
      to = { name: cleanName };
    } else {
      to.name = cleanName;
    }

    const isAdmin =
      (msg.robot.auth
        ? msg.robot.auth.hasRole(user, 'plusplus-admin')
        : undefined) ||
      (msg.robot.auth ? msg.robot.auth.hasRole(user, 'admin') : undefined);

    if (!msg.robot.auth || !isAdmin) {
      await msg.reply("Sorry, you don't have authorization to do that.");
      return;
    }
    if (isAdmin) {
      erased = await sks.erase(msg.robot, to, from, room, cleanReason);
    }

    if (erased) {
      const decodedReason = H.decode(cleanReason);
      const message = !decodedReason
        ? `Erased the following reason from ${to.name}: ${decodedReason}`
        : `Erased points for ${to.name}`;
      await msg.send(message);
    }
  }
}

module.exports = PlusPlusService;
module.exports.pps = PlusPlusService;
