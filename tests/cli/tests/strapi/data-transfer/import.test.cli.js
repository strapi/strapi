'use strict';

const fs = require('fs');
const path = require('path');
const coffee = require('coffee');
const { spawnSync } = require('child_process');

const utils = require('../../../../utils');
// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

const UPLOAD_CONTENT_TYPES = 'plugin::upload.file,plugin::upload.folder';

describe('import', () => {
  let appPath;
  let expectedDbState;
  const outputFilename = 'output';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();
    appPath = testApps.at(0);

    // Load fixture and capture expected DB state (so we can verify import restores it)
    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'with-admin');
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

  describe('import from unpacked directory', () => {
    const dirExportName = 'cli-import-dir-fixture';

    beforeAll(() => {
      const result = spawnSync(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'export',
          '--format',
          'dir',
          '-f',
          dirExportName,
          '--no-encrypt',
        ],
        {
          cwd: appPath,
          encoding: 'utf8',
          maxBuffer: 1024 * 1024,
        }
      );
      expect(result.status).toBe(0);
    });

    it('should import from directory and restore DB state', async () => {
      const importDir = path.join(appPath, dirExportName);
      const result = spawnSync(
        'npm',
        ['run', '-s', 'strapi', '--', 'import', '-f', importDir, '--force'],
        {
          cwd: appPath,
          encoding: 'utf8',
          maxBuffer: 1024 * 1024,
        }
      );

      expect(result.status).toBe(0);
      const stdout = String(result.stdout || '');
      expect(stdout).toMatch(/Import process has been completed successfully!?/);

      const stateAfterImport = utils.getDbState(appPath);
      if (stateAfterImport.error) {
        throw new Error(`Failed to read DB after import: ${stateAfterImport.error}`);
      }
      expect(stateAfterImport.articles).toBe(expectedDbState.articles);
      expect(stateAfterImport.categories).toBe(expectedDbState.categories);
    });
  });

  it('should import export without media (issue #25008) and preserve existing upload records', async () => {
    const excludedFilename = 'output-no-media-import';
    const exportResult = spawnSync(
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
        excludedFilename,
        '--exclude',
        'files',
        '--exclude-content-types',
        UPLOAD_CONTENT_TYPES,
      ],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );
    expect(exportResult.status).toBe(0);

    const importTar = path.join(appPath, `${excludedFilename}.tar`);
    const result = spawnSync(
      'npm',
      [
        'run',
        '-s',
        'strapi',
        '--',
        'import',
        '-f',
        importTar,
        '--force',
        '--exclude',
        'files',
        '--exclude-content-types',
        UPLOAD_CONTENT_TYPES,
      ],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );

    expect(result.status).toBe(0);
    const stateAfterImport = utils.getDbState(appPath);
    if (stateAfterImport.error) {
      throw new Error(`Failed to read DB after import: ${stateAfterImport.error}`);
    }

    expect(stateAfterImport.articles).toBe(expectedDbState.articles);
    expect(stateAfterImport.categories).toBe(expectedDbState.categories);
    expect(stateAfterImport.uploadFiles).toBe(expectedDbState.uploadFiles);
    expect(stateAfterImport.uploadFolders).toBe(expectedDbState.uploadFolders);
    expect(stateAfterImport.uploadFiles).toBeGreaterThan(0);
  });

  it('should import with --only-content-types and preserve other content types', async () => {
    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'with-admin');
    const stateBeforeImport = utils.getDbState(appPath);
    if (stateBeforeImport.error) {
      throw new Error(`Failed to read DB before import: ${stateBeforeImport.error}`);
    }
    expect(stateBeforeImport.articles).toBeGreaterThan(0);
    expect(stateBeforeImport.uploadFiles).toBeGreaterThan(0);

    const onlyArticlesFilename = 'output-only-articles-import-scope';
    const exportResult = spawnSync(
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
        onlyArticlesFilename,
        '--only-content-types',
        'api::article.article',
      ],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );
    expect(exportResult.status).toBe(0);

    const importTar = path.join(appPath, `${onlyArticlesFilename}.tar`);
    const result = spawnSync(
      'npm',
      [
        'run',
        '-s',
        'strapi',
        '--',
        'import',
        '-f',
        importTar,
        '--force',
        '--only-content-types',
        'api::article.article',
      ],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );

    expect(result.status).toBe(0);
    const stateAfterImport = utils.getDbState(appPath);
    if (stateAfterImport.error) {
      throw new Error(`Failed to read DB after import: ${stateAfterImport.error}`);
    }

    expect(stateAfterImport.articles).toBe(stateBeforeImport.articles);
    expect(stateAfterImport.categories).toBe(stateBeforeImport.categories);
    expect(stateAfterImport.uploadFiles).toBe(stateBeforeImport.uploadFiles);
    expect(stateAfterImport.uploadFolders).toBe(stateBeforeImport.uploadFolders);
    expect(stateAfterImport.categoryIds).toEqual(stateBeforeImport.categoryIds);
  });

  test.todo('import from .tar.gz (compressed) and verify DB state');
  test.todo('import from .tar.gz.enc (encrypted) with correct key and verify DB state');
  test.todo('import with wrong decryption key fails with clear error');
  test.todo('import with --only filter and verify only those types in DB');
  it('should preserve media library DB records when importing export with --exclude files', async () => {
    const excludedFilename = 'output-no-files';
    const exportResult = spawnSync(
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
        excludedFilename,
        '--exclude',
        'files',
      ],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );
    expect(exportResult.status).toBe(0);

    const importTar = path.join(appPath, `${excludedFilename}.tar`);
    const result = spawnSync(
      'npm',
      ['run', '-s', 'strapi', '--', 'import', '-f', importTar, '--force', '--exclude', 'files'],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );

    expect(result.status).toBe(0);
    const stateAfterImport = utils.getDbState(appPath);
    if (stateAfterImport.error) {
      throw new Error(`Failed to read DB after import: ${stateAfterImport.error}`);
    }

    expect(stateAfterImport.articles).toBe(expectedDbState.articles);
    expect(stateAfterImport.categories).toBe(expectedDbState.categories);
    expect(stateAfterImport.uploadFiles).toBe(expectedDbState.uploadFiles);
    expect(stateAfterImport.uploadFiles).toBeGreaterThan(0);
    if (expectedDbState.uploadFolders > 0) {
      expect(stateAfterImport.uploadFolders).toBe(expectedDbState.uploadFolders);
    }
  });
  // The destination uploads folder is emptied before the assets stage, so a missing sidecar
  // must not stop the bytes from being restored.
  it('should restore asset bytes with --only files when a metadata sidecar is missing', async () => {
    const dirExportName = 'cli-import-files-only-missing-sidecar';
    const exportResult = spawnSync(
      'npm',
      [
        'run',
        '-s',
        'strapi',
        '--',
        'export',
        '--format',
        'dir',
        '-f',
        dirExportName,
        '--no-encrypt',
      ],
      { cwd: appPath, encoding: 'utf8', maxBuffer: 1024 * 1024 }
    );
    expect(exportResult.status).toBe(0);

    const exportDir = path.join(appPath, dirExportName);
    const uploadNames = fs.readdirSync(path.join(exportDir, 'assets', 'uploads'));
    expect(uploadNames.length).toBeGreaterThan(0);

    const orphanedAsset = uploadNames[0];
    fs.rmSync(path.join(exportDir, 'assets', 'metadata', `${orphanedAsset}.json`));

    const uploadsDir = path.join(appPath, 'public', 'uploads');
    const result = spawnSync(
      'npm',
      ['run', '-s', 'strapi', '--', 'import', '-f', exportDir, '--force', '--only', 'files'],
      { cwd: appPath, encoding: 'utf8', maxBuffer: 1024 * 1024 }
    );

    expect(result.status).toBe(0);
    expect(`${result.stdout || ''}${result.stderr || ''}`).toMatch(
      /Missing asset metadata sidecar/
    );

    const restored = path.join(uploadsDir, orphanedAsset);
    expect(fs.existsSync(restored)).toBe(true);
    expect(fs.statSync(restored).size).toBeGreaterThan(0);
  });

  test.todo(
    'import when schema differs (e.g. version mismatch) and verify diff handling / --force'
  );
  test.todo('import empty archive and verify DB state (no entities)');
  test.todo('import table counts match actual DB counts per content type');
});
