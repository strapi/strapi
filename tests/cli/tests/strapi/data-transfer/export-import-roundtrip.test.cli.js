'use strict';

const path = require('path');
const coffee = require('coffee');

const utils = require('../../../../utils');
// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

const ROUNDTRIP_FILE = 'roundtrip';

describe('import-export', () => {
  let appPath;
  let stateBeforeExport;

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();
    appPath = testApps.at(0);
    if (!appPath) {
      throw new Error('TEST_APPS must be set to at least one test app path');
    }

    // Load fixture data (same pattern as create-user CLI test)
    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'with-admin.tar');

    stateBeforeExport = utils.getDbState(appPath);
    if (stateBeforeExport.error) {
      throw new Error(`Failed to read DB state: ${stateBeforeExport.error}`);
    }
  });

  it('should restore same data with new IDs after export then import', async () => {
    // Export
    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'export',
          '-f',
          ROUNDTRIP_FILE,
          '--no-encrypt',
          '--no-compress',
        ],
        { cwd: appPath }
      )
      .expect('code', 0)
      .end();

    const exportTar = path.join(appPath, `${ROUNDTRIP_FILE}.tar`);
    const stateAfterExport = utils.getDbState(appPath);
    expect(stateAfterExport.articles).toBe(stateBeforeExport.articles);
    expect(stateAfterExport.categories).toBe(stateBeforeExport.categories);

    // Import (restore from the export we just made)
    await coffee
      .spawn('npm', ['run', '-s', 'strapi', '--', 'import', '-f', exportTar, '--force'], {
        cwd: appPath,
      })
      .expect('code', 0)
      .end();

    const stateAfterImport = utils.getDbState(appPath);
    if (stateAfterImport.error) {
      throw new Error(`Failed to read DB after import: ${stateAfterImport.error}`);
    }

    // Same counts: data was restored
    expect(stateAfterImport.articles).toBe(stateBeforeExport.articles);
    expect(stateAfterImport.categories).toBe(stateBeforeExport.categories);

    // IDs changed: import deletes and recreates, so we get new IDs
    if (stateBeforeExport.articleIds?.length > 0) {
      expect(stateAfterImport.articleIds).toBeDefined();
      expect(stateAfterImport.articleIds.length).toBe(stateBeforeExport.articleIds.length);
      const idsChanged =
        stateAfterImport.articleIds.some((id, i) => id !== stateBeforeExport.articleIds[i]) ||
        stateAfterImport.categoryIds.some((id, i) => id !== stateBeforeExport.categoryIds[i]);
      expect(idsChanged).toBe(true);
    }
  });

  test.todo('roundtrip with compressed export/import (.tar.gz)');
  test.todo('roundtrip with encrypted export/import (.tar.gz.enc) and key');
  test.todo('roundtrip with --only (partial content) and verify only those types restored');
  test.todo('roundtrip with without-admin.tar fixture (different data combo)');
  test.todo('roundtrip preserves i18n locales and localized content counts');
  test.todo('roundtrip preserves draft vs published state where applicable');
});
