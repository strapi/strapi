'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const utils = require('../../../../utils');
// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

const UPLOAD_CONTENT_TYPES = 'plugin::upload.file,plugin::upload.folder';

describe('export', () => {
  let appPath;
  const outputFilename = 'output';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();
    appPath = testApps.at(0);

    // Load fixture so we have known data and predictable export output
    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'with-admin');
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

  it('should export to directory with --format dir and expected layout', async () => {
    const dirName = 'dir-export-output';
    const exportDir = path.join(appPath, dirName);

    if (fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true, force: true });
    }

    const result = spawnSync(
      'npm',
      ['run', '-s', 'strapi', '--', 'export', '--format', 'dir', '-f', dirName, '--no-encrypt'],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );

    expect(result.status).toBe(0);
    expect(fs.existsSync(exportDir)).toBe(true);

    const metadata = JSON.parse(fs.readFileSync(path.join(exportDir, 'metadata.json'), 'utf8'));
    expect(metadata).toHaveProperty('createdAt');
    expect(metadata).toHaveProperty('strapi');
    expect(metadata.strapi).toHaveProperty('version');

    const schemaFiles = fs
      .readdirSync(path.join(exportDir, 'schemas'))
      .filter((f) => f.endsWith('.jsonl'));
    const entityFiles = fs
      .readdirSync(path.join(exportDir, 'entities'))
      .filter((f) => f.endsWith('.jsonl'));
    expect(schemaFiles.length).toBeGreaterThan(0);
    expect(entityFiles.length).toBeGreaterThan(0);
  });

  it('should reject --format dir without --no-encrypt', () => {
    const result = spawnSync(
      'npm',
      ['run', '-s', 'strapi', '--', 'export', '--format', 'dir', '-f', 'reject-dir-no-flag'],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );
    expect(result.status).not.toBe(0);
    const combined = `${result.stderr || ''}${result.stdout || ''}`;
    expect(combined).toMatch(/require --no-encrypt/i);
  });

  it('should reject --format dir when --encrypt is used', () => {
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
        'reject-dir-test',
        '--encrypt',
      ],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );
    expect(result.status).not.toBe(0);
  });

  it('should exclude all media (issue #25008) with --exclude files and --exclude-content-types', async () => {
    const excludedFilename = 'output-no-media';
    const result = spawnSync(
      'npm',
      [
        'run',
        '-s',
        'strapi',
        '--',
        'export',
        '-f',
        excludedFilename,
        '--no-encrypt',
        '--no-compress',
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

    const exportTar = path.join(appPath, `${excludedFilename}.tar`);
    const { fs: testFs } = utils;
    const entities = await testFs.tar(exportTar).readJSONLDir('entities');
    const links = await testFs.tar(exportTar).readJSONLDir('links');
    const assetMetadata = await testFs.tar(exportTar).readDir('assets/metadata');
    const assetUploads = await testFs.tar(exportTar).readDir('assets/uploads');

    expect(assetMetadata).toHaveLength(0);
    expect(assetUploads).toHaveLength(0);
    expect(
      entities.some((entity) =>
        ['plugin::upload.file', 'plugin::upload.folder'].includes(entity.type)
      )
    ).toBe(false);
    expect(
      links.some(
        (link) =>
          ['plugin::upload.file', 'plugin::upload.folder'].includes(link.left.type) ||
          ['plugin::upload.file', 'plugin::upload.folder'].includes(link.right.type)
      )
    ).toBe(false);
    expect(entities.some((entity) => entity.type === 'api::article.article')).toBe(true);
  });

  it('should exclude all media (issue #25008) with --exclude media-library', async () => {
    const excludedFilename = 'output-no-media-preset';
    const result = spawnSync(
      'npm',
      [
        'run',
        '-s',
        'strapi',
        '--',
        'export',
        '-f',
        excludedFilename,
        '--no-encrypt',
        '--no-compress',
        '--exclude',
        'media-library',
      ],
      {
        cwd: appPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }
    );

    expect(result.status).toBe(0);

    const exportTar = path.join(appPath, `${excludedFilename}.tar`);
    const { fs: testFs } = utils;
    const entities = await testFs.tar(exportTar).readJSONLDir('entities');
    const links = await testFs.tar(exportTar).readJSONLDir('links');
    const assetMetadata = await testFs.tar(exportTar).readDir('assets/metadata');
    const assetUploads = await testFs.tar(exportTar).readDir('assets/uploads');

    expect(assetMetadata).toHaveLength(0);
    expect(assetUploads).toHaveLength(0);
    expect(
      entities.some((entity) =>
        ['plugin::upload.file', 'plugin::upload.folder'].includes(entity.type)
      )
    ).toBe(false);
    expect(
      links.some(
        (link) =>
          ['plugin::upload.file', 'plugin::upload.folder'].includes(link.left.type) ||
          ['plugin::upload.file', 'plugin::upload.folder'].includes(link.right.type)
      )
    ).toBe(false);
    expect(entities.some((entity) => entity.type === 'api::article.article')).toBe(true);
  });

  it('should export only listed content types with --only-content-types', async () => {
    const onlyArticlesFilename = 'output-only-articles';
    const result = spawnSync(
      'npm',
      [
        'run',
        '-s',
        'strapi',
        '--',
        'export',
        '-f',
        onlyArticlesFilename,
        '--no-encrypt',
        '--no-compress',
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

    const exportTar = path.join(appPath, `${onlyArticlesFilename}.tar`);
    const { fs: testFs } = utils;
    const entities = await testFs.tar(exportTar).readJSONLDir('entities');
    const links = await testFs.tar(exportTar).readJSONLDir('links');
    const schemaFiles = await testFs.tar(exportTar).readDir('schemas');

    const entityTypes = [...new Set(entities.map((entity) => entity.type))];
    expect(entityTypes).toEqual(['api::article.article']);
    expect(entities.length).toBeGreaterThan(0);
    expect(schemaFiles.length).toBeGreaterThan(0);
    expect(
      links.every(
        (link) =>
          link.left.type === 'api::article.article' && link.right.type === 'api::article.article'
      )
    ).toBe(true);
  });

  test.todo('export from empty DB (schemas only, no entities)');
  test.todo('export with --only filter and verify tar contains only those types');
  test.todo('export with --exclude filter and verify excluded types missing from tar');
  test.todo('export with compression (.tar.gz) and verify tar contents');
  test.todo('export with encryption (.tar.gz.enc) and verify prompt/key and tar not plaintext');
  test.todo('export table counts match actual tar entry counts per stage');
});
