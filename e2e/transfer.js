const {
  engine: { createTransferEngine },
  file: {
    providers: { createLocalFileSourceProvider },
  },
  strapi: {
    providers: { createRemoteStrapiDestinationProvider },
  },
} = require('@strapi/data-transfer');
const path = require('path');

const reset = async (filePath) => {
  const source = createLocalFileSourceProvider({
    file: { path: path.resolve(filePath) },
    compression: { enabled: false },
    encryption: { enabled: false },
  });

  const destination = createRemoteStrapiDestinationProvider({
    url: 'ws://localhost:1337/admin/transfer',
    strategy: 'restore',
  });

  const engine = createTransferEngine(source, destination, {
    schemaStrategy: 'ignore',
    versionStrategy: 'ignore',
  });

  try {
    console.log('??');
    await engine.transfer();
    console.log('Done');
    console.log(JSON.stringify(engine.progress.data, null, 2));
  } catch (e) {
    console.log('oops');
    console.log(e.message);
  }
};

module.exports = { reset };
