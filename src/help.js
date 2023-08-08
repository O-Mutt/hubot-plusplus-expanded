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
const { RegExpPlusPlus, conjunction } = require('./lib/RegExpPlusPlus');

module.exports = function help(robot) {
  const procVars = Helpers.getProcessVariables(process.env);

  robot.respond(RegExpPlusPlus.getHelp(), respondWithHelpGuidance);
  robot.respond(new RegExp(/(plusplus version|-v|--version)/, 'i'), (msg) => {
    msg.send(
      `${Helpers.capitalizeFirstLetter(msg.robot.name)} <${
        pjson.repository.url
      }|${pjson.name}> <https://www.npmjs.com/package/${pjson.name}|v${
        pjson.version
      }>.`,
    );
  });

  robot.hear(new RegExp('how much .*point.*', 'i'), tellHowMuchPointsAreWorth);

  const { monthlyScoreboardCron, monthlyScoreboardDayOfWeek } = procVars;
  function respondWithHelpGuidance(msg) {
    const bn = msg.robot.name || 'hubot';
    const helpMessage = ''.concat(
      '`<name>++ [<reason>]` - Increment score (for an optional reason). In place of `++` you can also use: `:clap:`, `:thumbsup:`, `:thumbsup_all:`, or `:+1:`\n',
      '`<name>-- [<reason>]` - Decrement score (for an optional reason). You can also use `:thumbsdown:`\n',
      '`{name1, name2, name3}++ [<reason>]` - Increment score for all names (for a reason)\n',
      '`{name1, name2, name3}-- [<reason>]` - Decrement score for all names (for a reason) \n',
      '`{name1, name2, name3}-- [<reason>]` - Decrement score for all names (for a reason) \n',
      `\`@${bn} score for <name>\` - Display the score for a name and some of the reasons\n`,
      `\`@${bn} [top|bottom] [tokens] <amount>\` - Display the top scoring <amount>, sorted by token/points if you include \`tokens\`\n`,
      `\`@${bn} erase <name> [<reason>]\` - Remove the score for a name (for a reason) \n`,
      `\`@${bn} level me up\` - Level up your account for some additional \`${bn}\`-iness \n`,
      '`how much are <point_type> points worth` - Shows how much <point_type> points are worth\n',
      '--------------------------------------------*Info*--------------------------------------------\n',
      `Every month (\`${monthlyScoreboardCron}\`), on ${monthlyScoreboardDayOfWeek}, ${bn} will send out an informational message to `,
      `<#${procVars.notificationsRoom || 'no room'}> to recognize the`,
      ' top 10 senders, top 10 recipients, and the top 3 slack channels that have been sending/receiving points. :eyes:\n',
      '--------------------------------------*Level 2 Commands*--------------------------------------\n',
      "`<name> + <number> [<reason>]` - Transfer <number> tokens from your wallet to the receiver's wallet (for an optional reason).\n",
      `\`hot wallet\` displays info about \`@${bn}\`'s wallet\n`,
      '`[<reason>]` indicates optional message parameters\n',
      `Each \`[<reason>]\` can be prefixed with a conjunction ${conjunction}`,
    );
    const message = {
      attachments: [
        {
          color: '//FEA500',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Need help with ${bn}?`,
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
      return msg.send(
        `A bitcoin is worth ${bitcoin} USD right now (${ars} ARS), a satoshi is about ${satoshi}, and ${msg.robot.name} points are worth nothing!`,
      );
    } catch (e) {
      return msg.send(
        `Seems like we are having trouble getting some data... Don't worry, though, your ${msg.robot.name} points are still worth nothing!`,
      );
    }
  }
};
