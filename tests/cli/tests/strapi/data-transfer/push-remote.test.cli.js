'use strict';

/**
 * End-to-end CLI test: push data (including upload files) from the local Strapi app to a running
 * remote. Runs on every strapi CLI pass with tiny seeded media by default.
 *
 * Stress only — increase synthetic file count/size:
 *   TRANSFER_CLI_MEDIA_COUNT   (default 2)
 *   TRANSFER_CLI_MEDIA_BYTES   (default 2048)
 *
 * Remote port: CLI_TRANSFER_REMOTE_PORT (legacy: CLI_TRANSFER_PULL_REMOTE_PORT), default 13710
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

describe('strapi transfer push — local to remote (generated media)', () => {
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

    await resetDatabaseAndImportDataFromPathProgrammatic(remotePath, 'with-admin');
    await resetDatabaseAndImportDataFromPathProgrammatic(localPath, 'with-admin');

    await seedTransferTestMedia(localPath);

    await execa('npm', ['run', '-s', 'build'], {
      cwd: localPath,
      stdio: 'inherit',
      env: { ...process.env, PATH: process.env.PATH },
    });

    await execa('npm', ['run', '-s', 'build'], {
      cwd: remotePath,
      stdio: 'inherit',
      env: { ...process.env, PATH: process.env.PATH },
    });

    const localFilesAfterSeed = countUploadFiles(localPath);
    expect(localFilesAfterSeed).toBeGreaterThan(0);

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

  it('pushes upload files to remote (counts + Strapi content hashes match)', async () => {
    const localSig = getSeedUploadSignature(localPath);
    expect(localSig.files.length).toBeGreaterThan(0);
    expect(getSeedUploadSignature(remotePath).files).toHaveLength(0);

    const localFiles = countUploadFiles(localPath);
    const toUrl = `http://127.0.0.1:${REMOTE_PORT}/admin`;

    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'transfer',
          '--to',
          toUrl,
          '--to-token',
          CUSTOM_TRANSFER_TOKEN_ACCESS_KEY,
          '--force',
        ],
        { cwd: localPath }
      )
      .expect('code', 0)
      .end();

    const remoteFiles = countUploadFiles(remotePath);
    expect(remoteFiles).toBe(localFiles);
    expect(getSeedUploadSignature(remotePath).files).toEqual(localSig.files);
  });
});
