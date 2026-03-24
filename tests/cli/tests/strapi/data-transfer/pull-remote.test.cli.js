'use strict';

/**
 * End-to-end CLI test: pull data (including upload files) from a running remote Strapi into a
 * second local test app. Runs on every strapi CLI pass with tiny seeded media by default.
 *
 * Stress only — increase synthetic file count/size:
 *   TRANSFER_CLI_MEDIA_COUNT   (default 2)
 *   TRANSFER_CLI_MEDIA_BYTES   (default 2048)
 *
 * Helpers: tests/utils/cli-transfer-remote-e2e/
 */

const { spawn } = require('child_process');
const coffee = require('coffee');
const execa = require('execa');

const utils = require('../../../../utils');
const {
  APP_TEMPLATE_CONSTANTS,
  getRemotePort,
  countUploadFiles,
  getSeedUploadSignature,
  jestSuiteTimeoutMs,
  seedTransferTestMedia,
  waitForHttpOk,
} = require('../../../../utils/cli-transfer-remote-e2e');
// eslint-disable-next-line import/extensions
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

const REMOTE_PORT = getRemotePort();

describe('strapi transfer pull — remote to local (generated media)', () => {
  jest.setTimeout(jestSuiteTimeoutMs());

  let remotePath;
  let localPath;
  let remoteChild;
  const { CUSTOM_TRANSFER_TOKEN_ACCESS_KEY } = require(APP_TEMPLATE_CONSTANTS);

  beforeAll(async () => {
    const apps = utils.instances.getTestApps();
    remotePath = apps[0];
    localPath = apps[1];
    if (!remotePath || !localPath) {
      throw new Error('Expected TEST_APPS to list two app paths (strapi domain testApps: 2)');
    }

    await resetDatabaseAndImportDataFromPathProgrammatic(remotePath, 'with-admin.tar');
    await resetDatabaseAndImportDataFromPathProgrammatic(localPath, 'with-admin.tar');

    await seedTransferTestMedia(remotePath);

    await execa('npm', ['run', '-s', 'build'], {
      cwd: remotePath,
      stdio: 'inherit',
      env: { ...process.env, PATH: process.env.PATH },
    });

    const remoteFilesAfterSeed = countUploadFiles(remotePath);
    expect(remoteFilesAfterSeed).toBeGreaterThan(0);

    remoteChild = spawn('npm', ['run', '-s', 'start'], {
      cwd: remotePath,
      env: {
        ...process.env,
        PORT: REMOTE_PORT,
        HOST: '127.0.0.1',
      },
      stdio: 'ignore',
    });

    const base = `http://127.0.0.1:${REMOTE_PORT}`;
    await waitForHttpOk(`${base}/admin`);

    const resetTok = await fetch(`${base}/api/config/resettransfertoken`, { method: 'POST' });
    if (!resetTok.ok) {
      throw new Error(`resettransfertoken failed: ${resetTok.status}`);
    }
  });

  afterAll(async () => {
    if (remoteChild && !remoteChild.killed) {
      remoteChild.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 2000));
      if (!remoteChild.killed) {
        remoteChild.kill('SIGKILL');
      }
    }
  });

  it('pulls upload files from remote (counts + Strapi content hashes match)', async () => {
    const remoteSig = getSeedUploadSignature(remotePath);
    expect(remoteSig.files.length).toBeGreaterThan(0);
    expect(getSeedUploadSignature(localPath).files).toHaveLength(0);

    const remoteFiles = countUploadFiles(remotePath);
    const fromUrl = `http://127.0.0.1:${REMOTE_PORT}/admin`;

    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'transfer',
          '--from',
          fromUrl,
          '--from-token',
          CUSTOM_TRANSFER_TOKEN_ACCESS_KEY,
          '--force',
        ],
        { cwd: localPath }
      )
      .expect('code', 0)
      .end();

    const localFiles = countUploadFiles(localPath);
    expect(localFiles).toBe(remoteFiles);
    expect(getSeedUploadSignature(localPath).files).toEqual(remoteSig.files);
  });
});
