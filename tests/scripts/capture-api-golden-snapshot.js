'use strict';

const path = require('path');

process.env.NODE_ENV = 'test';
process.env.ENV_PATH = path.resolve(__dirname, '../..', 'test-apps/api', '.env');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'aSecret';

const { createStrapiInstance } = require('../../packages/utils/api-tests/strapi');
const {
  captureGoldenSnapshot,
  goldenSnapshotExists,
  isGoldenRestoreSupported,
} = require('../../packages/utils/api-tests/golden-snapshot');

const main = async () => {
  const appDir = path.dirname(process.env.ENV_PATH);

  if (!isGoldenRestoreSupported(appDir)) {
    throw new Error(
      'golden-snapshot: DATABASE_CLIENT must be sqlite, postgres, or mysql in the test app .env'
    );
  }

  if (goldenSnapshotExists()) {
    console.log('[api-tests] golden snapshot already present, skipping capture');
    return;
  }

  const strapi = await createStrapiInstance({ logLevel: 'error' });

  try {
    const { goldenDir, client } = await captureGoldenSnapshot({ strapi });
    console.log(`[api-tests] golden snapshot captured at ${goldenDir} (${client})`);
  } finally {
    await strapi.destroy();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
