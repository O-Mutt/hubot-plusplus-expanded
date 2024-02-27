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

const { rpp } = require('../lib/matchers/messageMatchers');
const { ws } = require('../lib/services/wallet');

module.exports = function wallet(robot) {
  // message @robot.name
  robot.respond(rpp.getBotWallet(), ws.botWalletCount);

  // DM only
  robot.respond(rpp.createLevelUpAccount(), ws.levelUpAccount);
};
