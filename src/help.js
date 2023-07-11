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

const { default: axios } = require('axios');

const Helpers = require('./lib/Helpers');
const pjson = require('../package.json');
const RegExpPlusPlus = require('./lib/RegExpPlusPlus');

module.exports = function help(robot) {
  const procVars = Helpers.getProcessVariables(process.env);

  robot.respond(RegExpPlusPlus.getHelp(), respondWithHelpGuidance);
  robot.respond(new RegExp(/(plusplus version|-v|--version|version)/, 'i'), (msg) => {
    msg.send(`${Helpers.capitalizeFirstLetter(msg.robot.name)} is running <${pjson.repository.url}|${pjson.name}>: <https://www.npmjs.com/package/${pjson.name}|v${pjson.version}>.`);
  });

  robot.hear(new RegExp('how much .*point.*', 'i'), tellHowMuchPointsAreWorth);

  function respondWithHelpGuidance(msg) {
    const helpMessage = ''
      .concat('`<name>++ [<reason>]` - Increment score for a name (for a reason)\n')
      .concat('`<name>-- [<reason>]` - Decrement score for a name (for a reason)\n')
      .concat('`{name1, name2, name3}++ [<reason>]` - Increment score for all names (for a reason)\n')
      .concat('`{name1, name2, name3}-- [<reason>]` - Decrement score for all names (for a reason) \n')
      .concat('`{name1, name2, name3}-- [<reason>]` - Decrement score for all names (for a reason) \n')
      .concat(`\`@${msg.robot.name} score <name>\` - Display the score for a name and some of the reasons\n`)
      .concat(`\`@${msg.robot.name} top <amount>\` - Display the top scoring <amount>\n`)
      .concat(`\`@${msg.robot.name} erase <name> [<reason>]\` - Remove the score for a name (for a reason) \n`)
      .concat(
        `\`@${msg.robot.name} level me up\` - Level up your account for some additional ${msg.robot.name}iness \n`,
      )
      .concat('`how much are <point_type> points worth` - Shows how much <point_type> points are worth\n');

    const message = {
      attachments: [
        {
          color: '//FEA500',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Need help with ${msg.robot.name}?`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '_Commands_:',
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: helpMessage,
              },
            },
          ],
        },
      ],
    };

    if (procVars.furtherHelpUrl !== 'undefined') {
      message.attachments[0].blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `For further help please visit ${procVars.furtherHelpUrl}`,
        },
      });
    }
    msg.send(message);
  }

  async function tellHowMuchPointsAreWorth(msg) {
    try {
      const resp = await axios({
        url: 'https://api.coindesk.com/v1/bpi/currentprice/ARS.json',
      });

      const bitcoin = resp.data.bpi.USD.rate_float;
      const ars = resp.data.bpi.ARS.rate_float;
      const satoshi = bitcoin / 1e8;
      return msg.send(`A bitcoin is worth ${bitcoin} USD right now (${ars} ARS), a satoshi is about ${satoshi}, and ${msg.robot.name} points are worth nothing!`);
    } catch (e) {
      return msg.send(`Seems like we are having trouble getting some data... Don't worry, though, your ${msg.robot.name} points are still worth nothing!`);
    }
  }
};
