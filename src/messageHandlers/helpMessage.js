// Description:
//   The help message documentation for the hubot-plusplus script
//
// Commands:
//   @hubot help - responds with all the help
//   @hubot plusplus version - responds with the current plusplus module version
//   how much * point * - Shows how much hubot points are worth (e.g. how much are @qrafty points worth)
//
//
// Author:
//  O'Mutt (Matt@OKeefe.dev)

const { RegExpPlusPlus } = require('../lib/regExpPlusPlus');
const HelpService = require('../lib/services/help');

module.exports = function help(robot) {
  robot.respond(RegExpPlusPlus.getHelp(), HelpService.respondWithHelpGuidance);
  robot.respond(
    /(plusplus version|-v|--version)/i,
    HelpService.respondWithVersion,
  );

  robot.respond(/how much .*qrafty point.*/i, HelpService.tellHowMuchPointsAreWorth);
};
