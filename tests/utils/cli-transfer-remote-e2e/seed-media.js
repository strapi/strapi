'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const { SEED_UPLOAD_NAME_PREFIX } = require('./constants');

/**
 * Deterministic octet stream: every offset has a distinct value (per file index) so a
 * full-file checksum catches chunk reordering; a single fill byte would not.
 */
function createDeterministicTransferTestFile(fileIndex, byteLength) {
  const buf = Buffer.allocUnsafe(byteLength);
  for (let j = 0; j < byteLength; j += 1) {
    const mixed = (fileIndex + 1) * 0x9e3779b1 + j * 0x517cc1b7;
    buf[j] = (mixed ^ (mixed >>> 11) ^ (j << 3)) & 255;
  }
  return buf;
}

function parseCountEnv() {
  return Math.max(0, parseInt(process.env.TRANSFER_CLI_MEDIA_COUNT || '2', 10));
}

function parseBytesEnv() {
  return Math.max(1, parseInt(process.env.TRANSFER_CLI_MEDIA_BYTES || '2048', 10));
}

/**
 * @param {string} appPath - Strapi app root
 * @param {{ count?: number, bytes?: number }} [options] - defaults from env TRANSFER_CLI_MEDIA_*
 */
async function seedTransferTestMedia(appPath, options = {}) {
  const count = options.count ?? parseCountEnv();
  const bytes = options.bytes ?? parseBytesEnv();

  const { createStrapi } = require('@strapi/strapi');
  const { CUSTOM_TRANSFER_TOKEN_ACCESS_KEY } = require(path.join(appPath, 'src', 'constants.js'));

  const strapi = createStrapi({ appDir: appPath, distDir: appPath });
  await strapi.load();

  const { token: transferTokenService } = strapi.service('admin::transfer');
  const existing = await transferTokenService.list();
  for (const t of existing) {
    await transferTokenService.revoke(t.id);
  }
  await transferTokenService.create({
    name: 'CliTransferTestToken',
    description: 'CLI remote transfer e2e',
    lifespan: null,
    permissions: ['push', 'pull'],
    accessKey: CUSTOM_TRANSFER_TOKEN_ACCESS_KEY,
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-cli-transfer-seed-'));
  try {
    for (let i = 0; i < count; i += 1) {
      const name = `${SEED_UPLOAD_NAME_PREFIX}${i}.bin`;
      const tmpPath = path.join(tmpDir, name);
      fs.writeFileSync(tmpPath, createDeterministicTransferTestFile(i, bytes));

      await strapi
        .plugin('upload')
        .service('upload')
        .upload({
          data: {
            fileInfo: { name },
          },
          files: [
            {
              filepath: tmpPath,
              originalFilename: name,
              mimetype: 'application/octet-stream',
              size: bytes,
            },
          ],
        });
    }
  } finally {
    await strapi.destroy();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return { count, bytes };
}

/** CLI entry: `node seed-cli-transfer-media.js [appPath]` */
async function runFromCli(argv) {
  const appPath = argv[2] || process.cwd();
  const { count, bytes } = await seedTransferTestMedia(appPath);
  console.log(JSON.stringify({ ok: true, count, bytes }));
}

module.exports = {
  seedTransferTestMedia,
  runFromCli,
};
