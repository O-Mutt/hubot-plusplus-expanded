// Description:
//  Hubot scoreboard for hubot-plusplus-expanded.
//
// Commands:
//  @hubot score @<name> - Display the score for a name and some of the reasons
//  @hubot top <amount> - Display the top scoring <amount>
//  @hubot bottom <amount> - Display the bottom scoring <amount>
//
// Author:
//  O'Mutt (Matt@OKeefe.dev)
const { rpp } = require('../lib/regExpPlusPlus');
const ScoreboardService = require('../lib/services/scoreboard');

module.exports = function scoreboard(robot) {
  robot.respond(
    rpp.createAskForScoreRegExp(),
    ScoreboardService.respondWithScore,
  );
  robot.respond(
    rpp.createTopBottomRegExp(),
    ScoreboardService.respondWithLeaderLoserBoard,
  );
  robot.respond(
    rpp.createTopBottomTokenRegExp(),
    ScoreboardService.respondWithLeaderLoserTokenBoard,
  );
  robot.respond(
    rpp.createTopPointGiversRegExp(),
    ScoreboardService.getTopPointSenders,
  );
};
