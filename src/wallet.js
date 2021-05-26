async function levelUpAccount(msg) {
  const { room, user } = msg.message;
  if (room !== user.id) {
    return msg.reply(`You should only execute a level up from within the context of a DM with ${msg.message._robot_name}`);
  }

  msg.send('Way to go, we are ready to go with that!');
  return true;
}

module.exports = {
  levelUpAccount,
};
