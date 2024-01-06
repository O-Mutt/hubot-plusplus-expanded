const { getRoomStr, getUserStr } = require('./helpers');

module.exports.GeneratePlusPlusFailureEventObject =
  function GeneratePlusPlusFailureEventObject(
    { msg = {} } = {
      msg: {},
    },
  ) {
    if (Object.keys(msg).length === 0) {
      return {};
    }
    const falsePos = {};
    falsePos.room = getRoomStr(msg);
    const [fullText, premessage, _name, _number, conjunction, reason] =
      msg.match;
    if (fullText.length >= 150) {
      falsePos.messageStr = 'It was really long (>=150)';
    } else {
      falsePos.messageStr = 'It was a short message (<150)';
    }
    falsePos.fromUser = getUserStr(msg.message.user);

    falsePos.notificationMessage = `False positive detected in ${
      falsePos.room
    } from ${falsePos.fromUser}:
Has Pre-Message: [${!!premessage}].
Has Conjunction: [${!!conjunction}].
Has Reason: [${!!reason}].

<Message Redacted For Security>

${falsePos.messageStr}`;

    return {
      notificationMessage: falsePos.notificationMessage,
      room: falsePos.room,
    };
  };
