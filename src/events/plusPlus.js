const { H } = require('../lib/helpers');
const { getRoomStr, getUserStr } = require('./helpers');

module.exports.GeneratePlusPlusEventObject =
  function GeneratePlusPlusEventObject(
    {
      msg = {},
      operator = undefined,
      direction = '++',
      fromUser = {},
      toUser = {},
      cleanReason,
      amount = 1,
      silent = false,
    } = {
      msg: {},
      operator: undefined,
      direction: '++',
      fromUser: {},
      toUser: {},
      cleanReason: undefined,
      amount: 1,
      silent: false,
    },
  ) {
    // check if everything is defaults
    if (
      Object.keys(msg).length === 0 &&
      operator === undefined &&
      direction === '++' &&
      Object.keys(fromUser).length === 0 &&
      Object.keys(toUser).length === 0 &&
      cleanReason === undefined &&
      amount === 1
    ) {
      return {};
    }
    const plusPlusEvent = {};

    plusPlusEvent.msg = msg;
    plusPlusEvent.direction = operator ?? direction;
    plusPlusEvent.fromUser = fromUser;
    plusPlusEvent.toUser = toUser;
    plusPlusEvent.room = getRoomStr(msg);
    plusPlusEvent.robotName = msg?.robot?.name ?? 'hubot';
    plusPlusEvent.capitalRobotName = H.capitalizeFirstLetter(
      plusPlusEvent.robotName,
    );
    plusPlusEvent.cleanReason =
      cleanReason ?? `point given through ${plusPlusEvent.robotName}`;
    try {
      plusPlusEvent.amount = parseInt(amount, 10) ?? 1;
    } catch (e) {
      plusPlusEvent.amount = 1;
    }
    plusPlusEvent.pluralStrAddition = plusPlusEvent.amount > 1 ? 's' : '';

    const fromStr = getUserStr(plusPlusEvent.fromUser);
    const toStr = getUserStr(plusPlusEvent.toUser);

    let amountStr = plusPlusEvent.amount;
    if (plusPlusEvent.amount === 1) {
      amountStr = `a`;
      if (plusPlusEvent.toUser.name.match(/^[aeiou]/i)) {
        amountStr = `an`;
      }
    }

    return {
      amount: plusPlusEvent.amount,
      direction: plusPlusEvent.direction,
      msg: plusPlusEvent.msg,
      notificationMessage: `${fromStr} sent ${amountStr} ${plusPlusEvent.capitalRobotName} point${plusPlusEvent.pluralStrAddition} to ${toStr} in ${plusPlusEvent.room}`,
      reason: plusPlusEvent.cleanReason,
      recipient: plusPlusEvent.toUser,
      room: plusPlusEvent.room,
      sender: plusPlusEvent.fromUser,
      silent,
    };
  };
