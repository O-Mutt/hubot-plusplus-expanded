// Description:
//   Give or take away points. Keeps track and even prints out graphs.
//
//
// Configuration:
//   HUBOT_PLUSPLUS_KEYWORD: the keyword that will make hubot give the
//   score for a name and the reasons. For example you can set this to
//   "score|karma" so hubot will answer to both keywords.
//   If not provided will default to 'score'.
//
//   HUBOT_PLUSPLUS_REASON_CONJUNCTIONS: a pipe separated list of conjunctions to
//   be used when specifying reasons. The default value is
//   "for|because|cause|cuz|as|porque", so it can be used like:
//   "foo++ for being awesome" or "foo++ cuz they are awesome".
//
// Commands:
//   <name>++ [<reason>] - Increment score for a name (for a reason)
//   <name>-- [<reason>] - Decrement score for a name (for a reason)
//   {name1, name2, name3}++ [conjunction][<reason>] - Increment score for all names (for a reason)
//   {name1, name2, name3}-- [conjunction][<reason>] - Decrement score for all names (for a reason)
//   hubot erase <name> [<reason>] - Remove the score for a name (for a reason)
//
//
// Author: O-Mutt

import { SlackBot } from 'hubot-slack';
import { rpp, plusPlusMatcher } from '../lib/matchers/messageMatchers';
import { pps } from '../lib/services/plusplus';
import { Robot } from 'hubot';

export default function plusplus(robot: Robot<SlackBot>) {
  // listen to everything
  robot.listen(plusPlusMatcher, pps.upOrDownVote);
  robot.hear(rpp.createMultiUserVoteRegExp(), pps.multipleUsersVote);

  // admin
  robot.respond(rpp.createEraseUserScoreRegExp(), pps.eraseUserScore);
}
