const { WebClient } = require('@slack/web-api');

class ReactionService {
  static async addPlusPlusReaction(msg, silent = false) {
    await ReactionService.addReaction(msg.robot, {
      silent,
      msg,
      reactions: ['thumbsup', 'king_qrafty', 'hubot'],
    });
  }

  static async addReaction(robot, args) {
    try {
      let reactions = args.reactions ?? [];
      if (!Array.isArray(args.reactions)) {
        reactions = [args.reactions];
      }
      if (args.silent ?? false) {
        reactions.push('no_mouth');
      }

      const errors = [];
      const reactionPromises = [];
      const web = new WebClient(robot.adapter.options.token);
      if (!web) {
        robot.logger.error(
          `Web client failed to initialize for adding reactions`,
        );
        return;
      }
      for (const emoji of args.reactions) {
        if (emoji) {
          emoji.replace(':', '');
          try {
            reactionPromises.push(
              web.reactions.add({
                name: emoji,
                channel: args.msg.message.room,
                timestamp: args.msg.message.ts,
              }),
            );
          } catch (e) {
            errors.push(e);
          }
        }
      }
      await Promise.allSettled(reactionPromises);
      if (errors.length > 0) {
        robot.logger.error(`Error adding reactions`);
        for (const er of errors) {
          robot.logger.error(er);
        }
      }
    } catch (e) {
      robot.logger.error(`Error adding reactions`, e);
    }
  }
}

module.exports = ReactionService;
module.exports.rs = ReactionService;
