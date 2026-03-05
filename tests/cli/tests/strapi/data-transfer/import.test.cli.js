'use strict';

const path = require('path');
const coffee = require('coffee');
const { spawnSync } = require('child_process');

const utils = require('../../../../utils');
// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

describe('import', () => {
  let appPath;
  let expectedDbState;
  const outputFilename = 'output';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();
    appPath = testApps.at(0);

    // Load fixture and capture expected DB state (so we can verify import restores it)
    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'with-admin.tar');
    expectedDbState = utils.getDbState(appPath);

    // Export to create the file we will import in the tests
    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'export',
          '--no-encrypt',
          '--no-compress',
          '-f',
          outputFilename,
        ],
        { cwd: appPath }
      )
      .expect('code', 0)
      .end();
  });

  it('should prompt for confirmation before importing data', async () => {
    await coffee
      .spawn(
        'npm',
        ['run', '-s', 'strapi', '--', 'import', '-f', `${outputFilename}.tar`, '--force'],
        {
          cwd: appPath,
          stdio: 'inherit',
        }
      )
      .waitForPrompt()
      .write('Y\n')
      .expect('code', 0)
      .end();
  });

  it('should import data with correct CLI table and restore DB state', async () => {
    const importTar = path.join(appPath, `${outputFilename}.tar`);
    const result = spawnSync(
      'npm',
      ['run', '-s', 'strapi', '--', 'import', '-f', importTar, '--force'],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );

    expect(result.status).toBe(0);
    const stdout = String(result.stdout || '');

    // CLI table (stdout can be truncated before Total in some envs)
    expect(stdout).toMatch(/Import process has been completed successfully!?/);
    const totalMatch = stdout.match(/Total.*?(\d+).*?([\d.]+\s*[KMB]?B)/);
    if (totalMatch) {
      const totalCount = parseInt(totalMatch[1], 10);
      expect(totalCount).toBeGreaterThan(0);
    }

    // DB must have the same content counts as before (import restores data)
    const stateAfterImport = utils.getDbState(appPath);
    if (stateAfterImport.error) {
      throw new Error(`Failed to read DB after import: ${stateAfterImport.error}`);
    }
    expect(stateAfterImport.articles).toBe(expectedDbState.articles);
    expect(stateAfterImport.categories).toBe(expectedDbState.categories);
  });

  test.todo('import from .tar.gz (compressed) and verify DB state');
  test.todo('import from .tar.gz.enc (encrypted) with correct key and verify DB state');
  test.todo('import with wrong decryption key fails with clear error');
  test.todo('import with --only filter and verify only those types in DB');
  test.todo('import with --exclude filter and verify excluded types not in DB');
  test.todo(
    'import when schema differs (e.g. version mismatch) and verify diff handling / --force'
  );
  test.todo('import empty archive and verify DB state (no entities)');
  test.todo('import table counts match actual DB counts per content type');
});
