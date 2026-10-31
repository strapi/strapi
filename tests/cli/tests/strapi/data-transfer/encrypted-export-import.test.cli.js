'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { scryptSync, createCipheriv } = require('crypto');

const utils = require('../../../../utils');
// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

const ENCRYPTION_HEADER_MAGIC = Buffer.alloc(8);

Buffer.from('STRAPIEX', 'ascii').copy(ENCRYPTION_HEADER_MAGIC);

const ENCRYPTION_KEY = 'cli-transfer-encryption-key';

const runStrapi = (args, appPath) => {
  return spawnSync('npm', ['run', '-s', 'strapi', '--', ...args], {
    cwd: appPath,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
};

const hasStrapiExMagic = (buffer) => {
  return (
    buffer.length >= ENCRYPTION_HEADER_MAGIC.length &&
    buffer.subarray(0, 8).equals(ENCRYPTION_HEADER_MAGIC)
  );
};

const readSaltFromStrapiExHeader = (buffer) => {
  const headerLength = buffer.readUInt16BE(ENCRYPTION_HEADER_MAGIC.length + 1);
  const tlvOffset = 12;

  if (buffer.readUInt8(tlvOffset) !== 0x01) {
    return null;
  }

  const saltLength = buffer.readUInt8(tlvOffset + 1);

  return buffer.subarray(tlvOffset + 2, tlvOffset + 2 + saltLength);
};

const legacyEncryptTar = (inputPath, outputPath, key) => {
  const plaintext = fs.readFileSync(inputPath);
  const hashedKey = scryptSync(key, '', 16);
  const cipher = createCipheriv('aes-128-ecb', hashedKey, null);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  fs.writeFileSync(outputPath, encrypted);
};

describe('encrypted export/import', () => {
  let appPath;
  let baselineState;

  beforeAll(async () => {
    appPath = utils.instances.getTestApps().at(0);

    if (!appPath) {
      throw new Error('TEST_APPS must be set to at least one test app path');
    }

    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'with-admin');
    baselineState = utils.getDbState(appPath);

    if (baselineState.error) {
      throw new Error(`Failed to read DB state: ${baselineState.error}`);
    }
  });

  it('exports encrypted archives with a STRAPIEX header and per-export salt', () => {
    const exportA = 'strapiex-export-a';
    const exportB = 'strapiex-export-b';

    const resultA = runStrapi(
      ['export', '-f', exportA, '--no-compress', '--encrypt', '-k', ENCRYPTION_KEY],
      appPath
    );

    expect(resultA.status).toBe(0);

    const encPathA = path.join(appPath, `${exportA}.tar.enc`);
    const fileA = fs.readFileSync(encPathA);

    expect(hasStrapiExMagic(fileA)).toBe(true);
    expect(hasStrapiExMagic(fileA.subarray(0, 8))).toBe(true);

    const saltA = readSaltFromStrapiExHeader(fileA);

    expect(saltA).not.toBeNull();
    expect(saltA).toHaveLength(16);

    const resultB = runStrapi(
      ['export', '-f', exportB, '--no-compress', '--encrypt', '-k', ENCRYPTION_KEY],
      appPath
    );

    expect(resultB.status).toBe(0);

    const fileB = fs.readFileSync(path.join(appPath, `${exportB}.tar.enc`));
    const saltB = readSaltFromStrapiExHeader(fileB);

    expect(saltB).not.toEqual(saltA);
  });

  it('imports STRAPIEX encrypted exports and restores DB state', () => {
    const exportName = 'strapiex-roundtrip';
    const exportResult = runStrapi(
      ['export', '-f', exportName, '--no-compress', '--encrypt', '-k', ENCRYPTION_KEY],
      appPath
    );

    expect(exportResult.status).toBe(0);

    const encPath = path.join(appPath, `${exportName}.tar.enc`);
    const encrypted = fs.readFileSync(encPath);

    expect(hasStrapiExMagic(encrypted)).toBe(true);

    const importResult = runStrapi(
      ['import', '-f', encPath, '-k', ENCRYPTION_KEY, '--force'],
      appPath
    );

    expect(importResult.status).toBe(0);
    expect(String(importResult.stdout || '')).toMatch(
      /Import process has been completed successfully!?/
    );

    const stateAfterImport = utils.getDbState(appPath);

    if (stateAfterImport.error) {
      throw new Error(`Failed to read DB after import: ${stateAfterImport.error}`);
    }

    expect(stateAfterImport.articles).toBe(baselineState.articles);
    expect(stateAfterImport.categories).toBe(baselineState.categories);
  });

  it('imports legacy encrypted exports without a STRAPIEX header', () => {
    const plainName = 'legacy-plain-export';
    const legacyName = 'legacy-encrypted-export';

    const exportResult = runStrapi(
      ['export', '-f', plainName, '--no-encrypt', '--no-compress'],
      appPath
    );

    expect(exportResult.status).toBe(0);

    const plainTar = path.join(appPath, `${plainName}.tar`);
    const legacyEnc = path.join(appPath, `${legacyName}.tar.enc`);

    legacyEncryptTar(plainTar, legacyEnc, ENCRYPTION_KEY);

    const legacyFile = fs.readFileSync(legacyEnc);

    expect(hasStrapiExMagic(legacyFile)).toBe(false);

    const importResult = runStrapi(
      ['import', '-f', legacyEnc, '-k', ENCRYPTION_KEY, '--force'],
      appPath
    );

    expect(importResult.status).toBe(0);
    expect(String(importResult.stdout || '')).toMatch(
      /Import process has been completed successfully!?/
    );

    const stateAfterImport = utils.getDbState(appPath);

    if (stateAfterImport.error) {
      throw new Error(`Failed to read DB after legacy import: ${stateAfterImport.error}`);
    }

    expect(stateAfterImport.articles).toBe(baselineState.articles);
    expect(stateAfterImport.categories).toBe(baselineState.categories);
  });
});
