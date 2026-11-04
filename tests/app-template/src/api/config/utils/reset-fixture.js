'use strict';

const { resolve } = require('node:path');

const {
  directory: {
    providers: { createLocalDirectorySourceProvider },
  },
  strapi: {
    providers: { createLocalStrapiDestinationProvider },
    normalizeRemoteRestoreOptions,
  },
  engine: { createTransferEngine },
} = require('@strapi/data-transfer');

const { createTestTransferToken } = require('../../../create-transfer-token');
const resetAdminFixtureData = require('./reset-admin-fixture');

/**
 * Restore an e2e fixture from inside the running app.
 *
 * Same restore as the DTS remote push `tests/utils/dts-import.ts` used to run over the websocket:
 * the push handler builds this same local destination provider with
 * `normalizeRemoteRestoreOptions`, so the rows written are the same. Running it here skips the
 * websocket round trips and the per-call transfer engine on the Playwright side.
 *
 * Order matches the remote flow: admin entities first, then the test transfer token, then
 * every other included type and the configuration.
 */
module.exports = async (strapi, { fixture, includedTypes, configuration }) => {
  if (!Array.isArray(includedTypes) || includedTypes.some((uid) => typeof uid !== 'string')) {
    throw new Error('includedTypes must be an array of content type UIDs');
  }

  // Validates `fixture` against the allowed fixture names before any path is built from it.
  await resetAdminFixtureData(strapi, fixture);
  await createTestTransferToken(strapi);

  const source = createLocalDirectorySourceProvider({
    directory: {
      path: resolve(strapi.dirs.app.root, '../../../tests/e2e/data', fixture),
    },
  });
  const destination = createLocalStrapiDestinationProvider({
    async getStrapi() {
      return strapi;
    },
    autoDestroy: false,
    strategy: 'restore',
    restore: normalizeRemoteRestoreOptions(strapi, {
      assets: true,
      entities: { include: includedTypes },
      configuration: configuration ?? { coreStore: true },
    }),
  });

  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'ignore',
    schemaStrategy: 'ignore',
    // The without-admin fixture only contains protected admin entities and links, restored above.
    only: fixture === 'without-admin' ? ['config'] : undefined,
    transforms: {
      links: [
        {
          // only transfer relations to+from requested content types
          filter(link) {
            return (
              includedTypes.includes(link.left.type) &&
              (includedTypes.includes(link.right.type) || link.right.type === undefined)
            );
          },
        },
      ],
      entities: [
        {
          // only include entities of requested content types
          filter(entity) {
            return includedTypes.includes(entity.type);
          },
        },
      ],
    },
  });

  engine.diagnostics.onDiagnostic((diagnostic) => {
    if (diagnostic.kind !== 'info') strapi.log.warn(JSON.stringify(diagnostic));
  });

  await engine.transfer();
};
