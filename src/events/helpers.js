module.exports = {
  getRoomStr(msg) {
    if (msg.room) {
      return `<#${msg.room}>`;
    }
    if (msg.message && msg.message.room) {
      return `<#${msg.message.room}>`;
    }
    if (msg.envelope && msg.envelope.room) {
      return `<#${msg.envelope.room}>`;
    }
    return 'Unknown Room';
  },

  getUserStr(user) {
    if (!user) {
      return 'Unknown User';
    }

    if (user.slackId) {
      return `<@${user.slackId}>`;
    }
    if (user.id) {
      return `<@${user.id}>`;
    }
    return user.name;
  },
};
