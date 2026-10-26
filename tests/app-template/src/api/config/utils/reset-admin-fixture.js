'use strict';

const { resolve } = require('node:path');

const {
  directory: {
    providers: { createLocalDirectorySourceProvider },
  },
  strapi: {
    providers: { createLocalStrapiDestinationProvider },
    isProtectedRemotePushType,
  },
  engine: { createTransferEngine },
} = require('@strapi/data-transfer');

const ADMIN_CONTENT_TYPES = [
  'admin::user',
  'admin::role',
  'admin::permission',
  'admin::api-token',
  'admin::transfer-token',
];

const ALLOWED_FIXTURES = new Set(['with-admin', 'without-admin']);

module.exports = async (strapi, fixture) => {
  if (!ALLOWED_FIXTURES.has(fixture)) {
    throw new Error(`Unsupported admin fixture "${fixture}"`);
  }

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
    restore: {
      assets: false,
      entities: { include: ADMIN_CONTENT_TYPES },
      configuration: { coreStore: false, webhook: false },
    },
  });
  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'ignore',
    schemaStrategy: 'ignore',
    only: ['content'],
    transforms: {
      entities: [{ filter: (entity) => isProtectedRemotePushType(entity.type) }],
      links: [
        {
          filter: (link) =>
            isProtectedRemotePushType(link.left.type) &&
            (link.right.type === undefined || isProtectedRemotePushType(link.right.type)),
        },
      ],
    },
  });

  await engine.transfer();
};
