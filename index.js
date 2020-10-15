const path = require('path');

module.exports = function (robot, scripts) {
  const scriptsPath = path.resolve(__dirname, 'src');
  return robot.loadFile(scriptsPath, 'plusplus.js');
};
