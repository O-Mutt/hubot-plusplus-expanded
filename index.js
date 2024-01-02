/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const tokenBuddy = require('token-buddy');

const DatabaseService = require('./src/lib/services/database');
const Crypto = require('./src/lib/services/decrypt');
const token = require('./src/lib/token.json');
const { H } = require('./src/lib/helpers');

function loadScripts(robot, directory) {
  const results = [];

  fs.readdirSync(directory).forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      // Recurse into subdirectory
      results.push(...loadScripts(robot, filePath));
    } else if (!file.endsWith('.test.js') && path.extname(file) === '.js') {
      // Load .js files that don't export a class
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const exported = require(filePath);
      if (
        exported instanceof Function &&
        !exported.toString().startsWith('class')
      ) {
        results.push(robot.loadFile(directory, file));
      }
    }
  });

  return results;
}

module.exports = (robot, scripts) => {
  const procVars = H.getProcessVariables(process.env);
  const databaseService = new DatabaseService(robot);

  databaseService
    .getMagicSecretStringNumberValue()
    .then((databaseMagicString) => {
      const magicMnumber = Crypto.decrypt(
        procVars.magicIv,
        procVars.magicNumber,
        databaseMagicString,
      );
      tokenBuddy
        .init({
          index: 0,
          mnemonic: magicMnumber,
          token,
          provider: procVars.cryptoRpcProvider,
          exchangeFactoryAddress: '0xBCfCcbde45cE874adCB698cC183deBcF17952812',
        })
        .then(() => {
          tokenBuddy.newAccount();
        });
    })
    .catch((err) => {
      robot.logger.error(
        'Error getting magic string from database: ignore ',
        err,
      );
    });

  const scriptsPath = path.resolve(__dirname, 'src');
  return fs.exists(scriptsPath, (exists) => {
    if (exists) {
      const scriptsToLoad =
        scripts && scripts.indexOf('*') < 0 ? scripts : null;
      const loadedScripts = loadScripts(robot, scriptsPath);

      // Filter out scripts that weren't loaded
      if (scriptsToLoad) {
        const missingScripts = scriptsToLoad.filter(
          (script) => !loadedScripts.includes(script),
        );
        if (missingScripts.length > 0) {
          console.error(
            `Hubot couldn't find the following scripts: ${missingScripts.join(
              ', ',
            )}`,
          );
        }
      }
    }
  });
};
