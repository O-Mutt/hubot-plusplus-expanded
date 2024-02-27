import { Adapter, CatchAllMessage, ListenerCallback, Response } from 'hubot';
import { User } from '../lib/dataModels/user';
import { getRoomStr, getUserStr } from './helpers';
import { PlusPlusMatches } from '../lib/matchers/types/plusPlusMatches';

const { H } = require('../lib/helpers');

export type GeneratePlusPlusEventObjectParams = {
  msg: PlusPlusMatches;
  operator: '++' | '--';
  fromUser: User;
  toUser: User;
  cleanReason?: string;
  amount: number;
  silent: boolean;
  robotName?: string;
  room?: string;
};

export function GeneratePlusPlusEventObject(
  plusPlusEvent: GeneratePlusPlusEventObjectParams,
) {
  plusPlusEvent.room = getRoomStr(plusPlusEvent.msg);
  plusPlusEvent.robotName = plusPlusEvent.msg.name ?? 'hubot';
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
}
