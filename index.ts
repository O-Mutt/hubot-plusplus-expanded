import { Robot } from 'hubot';
import fs from 'fs';
import path from 'path';
import tokenBuddy from 'token-buddy';

import { dbs } from './src/lib/services/database';
import Crypto from './src/lib/services/decrypt';
import token from './src/lib/token.json';
import { Configuration, loadConfig } from './src/config';

function isIgnored(file: string, filePath: string): boolean {
  if (file === '__tests__' || file === '__mocks__') {
    return true;
  }

  if (
    file.endsWith('.test.js') ||
    file.endsWith('.test.coffee') ||
    file.endsWith('.test.ts')
  ) {
    return true;
  }
  if (path.extname(file) === '.js') {
    const maybeExported = require(filePath);
    if (
      !(maybeExported instanceof Function) ||
      maybeExported.toString().startsWith('class')
    ) {
      return true;
    }
  }
  return false;
}

async function loadScripts(robot: Robot, directory: string): Promise<void> {
  const maybeFiles = await fs.promises.readdir(directory);
  for (const file of maybeFiles) {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory() && !isIgnored(file, filePath)) {
      // Recurse into subdirectory
      loadScripts(robot, filePath);
    } else if (!isIgnored(file, filePath)) {
      robot.loadFile(directory, file);
    }
  }
}

async function loadCrypto(config: Configuration, robot: Robot) {
  if (
    config.get('magicIv') &&
    config.get('magicNumber') &&
    config.get('cryptoRpcProvider')
  ) {
    try {
      const databaseMagicString =
        await dbs.getMagicSecretStringNumberValue(robot);

      const magicMnumber = Crypto.decrypt(
        config.get('magicIv'),
        config.get('magicNumber'),
        databaseMagicString,
      );
      tokenBuddy
        .init({
          index: 0,
          mnemonic: magicMnumber,
          token,
          provider: config.get('cryptoRpcProvider'),
          exchangeFactoryAddress: '0xBCfCcbde45cE874adCB698cC183deBcF17952812',
        })
        .then(() => {
          tokenBuddy.newAccount();
        });
    } catch (err) {
      robot.logger.error(
        'Error getting magic string from database: ignore ',
        err,
      );
    }
  }
}

export default async function runBot(robot: Robot) {
  const config = loadConfig();

  await loadCrypto(config, robot);

  const scriptsPath = path.resolve(__dirname, 'src');
  try {
    await fs.promises.access(scriptsPath);
    loadScripts(robot, scriptsPath);
    // Do something with loadedScripts...
  } catch (error) {
    console.error(`Directory is not accessible: ${scriptsPath}`);
  }
}
