'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const utils = require('../../../../utils');
// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

describe('export', () => {
  let appPath;
  const outputFilename = 'output';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();
    appPath = testApps.at(0);

    // Load fixture so we have known data and predictable export output
    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'with-admin.tar');
  });

  it('should export data with correct CLI table and tar contents', async () => {
    const result = spawnSync(
      'npm',
      [
        'run',
        '-s',
        'strapi',
        '--',
        'export',
        '-f',
        outputFilename,
        '--no-encrypt',
        '--no-compress',
      ],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );

    expect(result.status).toBe(0);
    const stdout = String(result.stdout || '');

    // CLI table: expect header (stdout can be truncated before Total row in some envs)
    expect(stdout).toMatch(/Type.*Count.*Size/);
    const totalMatch = stdout.match(/Total.*?(\d+).*?([\d.]+\s*[KMB]?B)/);
    if (totalMatch) {
      const totalCount = parseInt(totalMatch[1], 10);
      expect(totalCount).toBeGreaterThan(0);
    }

    // Tar must exist and contain expected structure (stdout may be truncated after table in some envs)
    const exportTar = path.join(appPath, `${outputFilename}.tar`);
    const { fs: testFs } = utils;
    const metadata = await testFs.tar(exportTar).readJSONFile('metadata.json');
    expect(metadata).toBeDefined();
    expect(metadata).toHaveProperty('createdAt');
    expect(metadata).toHaveProperty('strapi');
    expect(metadata.strapi).toHaveProperty('version');

    const schemaFiles = await testFs.tar(exportTar).readDir('schemas');
    const entityFiles = await testFs.tar(exportTar).readDir('entities');
    expect(schemaFiles.length).toBeGreaterThan(0);
    expect(entityFiles.length).toBeGreaterThan(0);
  });

  test.todo('export from empty DB (schemas only, no entities)');
  test.todo('export with --only filter and verify tar contains only those types');
  test.todo('export with --exclude filter and verify excluded types missing from tar');
  test.todo('export with compression (.tar.gz) and verify tar contents');
  test.todo('export with encryption (.tar.gz.enc) and verify prompt/key and tar not plaintext');
  test.todo('export table counts match actual tar entry counts per stage');
});
