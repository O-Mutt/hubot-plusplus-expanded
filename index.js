const fs = require('fs');
const path = require('path');

module.exports = (robot, scripts) => {
  const scriptsPath = path.resolve(__dirname, 'src');
  return fs.exists(scriptsPath, (exists) => {
    const results = [];
    if (exists) {
      const ref = fs.readdirSync(scriptsPath);
      for (let i = 0, len = ref.length; i < len; i++) {
        const script = ref[i];
        if (scripts && scripts.indexOf('*') < 0) {
          if (scripts.indexOf(script) > -1) {
            results.push(robot.loadFile(scriptsPath, script));
          }
        } else {
          results.push(robot.loadFile(scriptsPath, script));
        }
      }
    }
    return results;
  });
};
