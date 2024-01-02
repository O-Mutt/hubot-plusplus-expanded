// Description:
//  Handles token transfers between users
//
// Commands:
//  @hubot hot wallet - displays info for hubot's 'hot wallet'
//  @hubot level up my account - moves the user's account up 1 level (e.g. 1->2) to allow them to start receiving crypto
//
// Author:
//  O'Mutt (Matt@OKeefe.dev)

const { rpp } = require('../lib/regExpPlusPlus');
const TokenService = require('../lib/services/token');

module.exports = function tokens(robot) {
  // listen for bot tag/ping
  robot.respond(
    rpp.createGiveTokenRegExp(),
    TokenService.giveTokenBetweenUsers,
  );
};
