// Description:
//   Give or take away points. Keeps track and even prints out graphs.
//
//
// Configuration:
//   HUBOT_PLUSPLUS_KEYWORD: the keyword that will make hubot give the
//   score for a name and the reasons. For example you can set this to
//   "score|karma" so hubot will answer to both keywords.
//   If not provided will default to 'score'.
//
//   HUBOT_PLUSPLUS_REASON_CONJUNCTIONS: a pipe separated list of conjunctions to
//   be used when specifying reasons. The default value is
//   "for|because|cause|cuz|as|porque", so it can be used like:
//   "foo++ for being awesome" or "foo++ cuz they are awesome".
//
// Commands:
//   <name>++ [<reason>] - Increment score for a name (for a reason)
//   <name>-- [<reason>] - Decrement score for a name (for a reason)
//   {name1, name2, name3}++ [conjunction][<reason>] - Increment score for all names (for a reason)
//   {name1, name2, name3}-- [conjunction][<reason>] - Decrement score for all names (for a reason)
//   hubot erase <name> [<reason>] - Remove the score for a name (for a reason)
//
//
// Author: O-Mutt

const { RegExpPlusPlus } = require('../lib/RegExpPlusPlus');
const ScoreKeeper = require('../lib/services/scorekeeper');
const Helpers = require('../lib/Helpers');
// this may need to move or be generic...er
const MessageFactory = require('../lib/MessageFactory');

module.exports = function plusplus(robot) {
  const procVars = Helpers.getProcessVariables(process.env);
  const scoreKeeper = new ScoreKeeper({ robot, ...procVars });

  // listen to everything
  robot.hear(RegExpPlusPlus.createUpDownVoteRegExp(), upOrDownVote);
  robot.hear(RegExpPlusPlus.createMultiUserVoteRegExp(), multipleUsersVote);

  // admin
  robot.respond(RegExpPlusPlus.createEraseUserScoreRegExp(), eraseUserScore);

  /**
   * Functions for responding to commands
   */
  async function upOrDownVote(msg) {
    const [fullText, premessage, name, operator, conjunction, reason] =
      msg.match;

    if (
      Helpers.isKnownFalsePositive(premessage, conjunction, reason, operator)
    ) {
      // circuit break a plus plus
      robot.emit('plus-plus-failure', {
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
    const increment = operator.match(RegExpPlusPlus.positiveOperators) ? 1 : -1;
    const { room, mentions } = msg.message;
    const cleanName = Helpers.cleanName(name);
    let to = { name: cleanName };
    if (mentions) {
      to = mentions.filter((men) => men.type === 'user').shift();
      to.name = cleanName;
    }
    const cleanReason = Helpers.cleanAndEncode(reason);
    const from = msg.message.user;

    robot.logger.debug(
      `${increment} score for [${to.name}] from [${from}]${
        cleanReason ? ` because ${cleanReason}` : ''
      } in [${room}]`,
    );
    let toUser;
    let fromUser;
    try {
      ({ toUser, fromUser } = await scoreKeeper.incrementScore(
        to,
        from,
        room,
        cleanReason,
        increment,
      ));
    } catch (e) {
      msg.send(e.message);
      return;
    }

    const message = MessageFactory.BuildNewScoreMessage(
      toUser,
      cleanReason,
      robot.name,
    );

    if (message) {
      msg.send(message);
      robot.emit('plus-plus', {
        notificationMessage: `<@${fromUser.slackId}> ${
          operator.match(RegExpPlusPlus.positiveOperators) ? 'sent' : 'removed'
        } a ${Helpers.capitalizeFirstLetter(robot.name)} point ${
          operator.match(RegExpPlusPlus.positiveOperators) ? 'to' : 'from'
        } <@${toUser.slackId}> in <#${room}>`,
        sender: fromUser,
        recipient: toUser,
        direction: operator,
        amount: 1,
        room,
        reason: cleanReason,
        msg,
      });
    }
  }

  async function multipleUsersVote(msg) {
    const [fullText, premessage, names, operator, conjunction, reason] =
      msg.match;
    if (!names) {
      return;
    }
    if (
      Helpers.isKnownFalsePositive(premessage, conjunction, reason, operator)
    ) {
      // circuit break a plus plus
      robot.emit('plus-plus-failure', {
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

    const namesArray = names
      .trim()
      .toLowerCase()
      .split(new RegExp(RegExpPlusPlus.multiUserSeparator))
      .filter(Boolean);

    const cleanNames = namesArray
      // Parse names
      .map((name) => {
        const cleanedName = Helpers.cleanName(name);
        return cleanedName;
      })
      // Remove empty ones: {,,,}++
      .filter((name) => !!name.length)
      // Remove duplicates: {user1,user1}++
      .filter((name, pos, self) => self.indexOf(name) === pos);

    const from = msg.message.user;
    const { room, mentions } = msg.message;
    let to = cleanNames.map((cn) => ({ name: cn }));
    if (mentions) {
      to = mentions
        .filter((men) => men.type === 'user')
        .filter(
          (single, index, allMentions) =>
            index === allMentions.findIndex((m) => m.id === single.id),
        );
    }
    const cleanReason = Helpers.cleanAndEncode(reason);
    const increment = operator.match(RegExpPlusPlus.positiveOperators) ? 1 : -1;

    if (cleanNames.length !== to.length) {
      msg.send(
        'We are having trouble mapping your multi-user plusplus. Please try again and only include @ mentions.',
      );
      return;
    }

    let messages = [];
    let fromUser;
    for (let i = 0; i < cleanNames.length; i++) {
      to[i].name = cleanNames[i];
      let toUser;
      try {
        ({ toUser, fromUser } = await scoreKeeper.incrementScore(
          to[i],
          from,
          room,
          cleanReason,
          increment,
        ));
      } catch (err) {
        //handled in the inc score, we should skip and continue continue
        continue;
      }
      if (toUser) {
        robot.logger.debug(
          `clean names map [${to[i].name}]: ${toUser.score}, the reason ${toUser.reasons[cleanReason]}`,
        );
        messages.push(
          MessageFactory.BuildNewScoreMessage(toUser, cleanReason, robot),
        );
        robot.emit('plus-plus', {
          notificationMessage: `<@${fromUser.slackId}> ${
            operator.match(RegExpPlusPlus.positiveOperators)
              ? 'sent'
              : 'removed'
          } a ${Helpers.capitalizeFirstLetter(robot.name)} point ${
            operator.match(RegExpPlusPlus.positiveOperators) ? 'to' : 'from'
          } <@${toUser.slackId}> in <#${room}>`,
          sender: fromUser,
          recipient: toUser,
          direction: operator,
          amount: 1,
          room,
          reason: cleanReason,
          msg,
        });
      }
    }
    messages = messages.filter((message) => !!message); // de-dupe

    robot.logger.debug(`These are the messages \n ${messages.join('\n')}`);
    msg.send(messages.join('\n'));
  }

  /**
   * Erase a user's score, only admin accessible
   * @param {Object} msg
   * @returns {Promise<void>}
   *
   */
  async function eraseUserScore(msg) {
    let erased;
    const [fullText, premessage, name, conjunction, reason] = msg.match;
    const from = msg.message.user;
    const { user } = msg.envelope;
    const { room, mentions } = msg.message;

    const cleanReason = Helpers.cleanAndEncode(reason);
    let to = mentions.filter((men) => men.type === 'user').shift();
    const cleanName = Helpers.cleanName(name);
    if (!to) {
      to = { name: cleanName };
    } else {
      to.name = cleanName;
    }

    const isAdmin =
      (this.robot.auth
        ? this.robot.auth.hasRole(user, 'plusplus-admin')
        : undefined) ||
      (this.robot.auth ? this.robot.auth.hasRole(user, 'admin') : undefined);

    if (!this.robot.auth || !isAdmin) {
      msg.reply("Sorry, you don't have authorization to do that.");
      return;
    }
    if (isAdmin) {
      erased = await scoreKeeper.erase(to, from, room, cleanReason);
    }

    if (erased) {
      const decodedReason = Helpers.decode(cleanReason);
      const message = !decodedReason
        ? `Erased the following reason from ${to.name}: ${decodedReason}`
        : `Erased points for ${to.name}`;
      msg.send(message);
    }
  }
};
