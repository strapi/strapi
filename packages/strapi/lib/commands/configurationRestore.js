'use strict';

const _ = require('lodash');
const fs = require('fs');
const strapi = require('../index');

/**
 * Will restore configurations. It reads from a file or stdin
 * @param {string} file filepath to use as input
 * @param {string} strategy import strategy. one of (replace, merge, keep, default: replace)
 */
module.exports = async function({ file, strategy = 'replace' }) {
  const input = file ? fs.readFileSync(file) : await readStdin(process.stdin);

  const app = await strapi().load();

  let dataToImport;
  try {
    dataToImport = JSON.parse(input);

    if (!Array.isArray(dataToImport)) {
      throw new Error(`Invalid input data. Expected a valid JSON array.`);
    }
  } catch (error) {
    throw new Error(`Invalid input data: ${error.message}. Expected a valid JSON array.`);
  }

  const importer = createImporter(app.db, strategy);

  for (const config of dataToImport) {
    await importer.import(config);
  }

  console.log(`Successfully imported ${dataToImport.length} configuration entries`);
  process.exit(0);
};

const readStdin = () => {
  const { stdin } = process;
  let result = '';

  if (stdin.isTTY) return Promise.resolve(result);

  return new Promise((resolve, reject) => {
    stdin.setEncoding('utf8');
    stdin.on('readable', () => {
      let chunk;
      while ((chunk = stdin.read())) {
        result += chunk;
      }
    });

    stdin.on('end', () => {
      resolve(result);
    });

    stdin.on('error', reject);
  });
};

const createImporter = (db, strategy) => {
  switch (strategy) {
    case 'replace':
      return new ReplaceImporter(db);
    case 'merge':
      return new MergeImporter(db);
    case 'keep':
      return new KeepImporter(db);
    default:
      throw new Error(`No importer available for strategy "${strategy}"`);
  }
};

function ReplaceImporter(db) {
  return {
    async import(conf) {
      const matching = await db.query('core_store').count({ key: conf.key });
      if (matching > 0) {
        await db.query('core_store').update({ key: conf.key }, conf);
      } else {
        await db.query('core_store').create(conf);
      }
    },
  };
}

function MergeImporter(db) {
  return {
    async import(conf) {
      const existingConf = await db.query('core_store').find({ key: conf.key });
      if (existingConf) {
        await db.query('core_store').update({ key: conf.key }, _.merge(existingConf, conf));
      } else {
        await db.query('core_store').create(conf);
      }
    },
  };
}

function KeepImporter(db) {
  return {
    async import(conf) {
      const matching = await db.query('core_store').count({ key: conf.key });
      if (matching > 0) {
        // if configuration already exists do not overwrite it
        return;
      }

      await db.query('core_store').create(conf);
    },
  };
}
