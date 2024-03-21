'use strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import loadConfigDir from '../config-loader';

describe('loadConfigDir', () => {
  let tempDir: string;
  let externalTempDir: string;
  const testFileName = 'admin.js';
  const testLinkName = 'link.js';
  const testFileContentObject = {
    admin: {
      apiToken: {
        salt: 'SecretSalt',
      },
      auth: {
        secret: 'SecretTest',
      },
      transfer: {
        token: {
          salt: 'SecretTransferSalt',
        },
      },
    },
  };
  const testFileContent = `
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.default = ({ env }) => ({
          auth: {
              secret: "SecretTest",
          },
          apiToken: {
              salt: "SecretSalt",
          },
          transfer: {
              token: {
                  salt: "SecretTransferSalt",
              },
          },
      });
      `;

  beforeEach(() => {
    // Create a temporary directory for the test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    externalTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-link-'));
  });

  afterEach(() => {
    // Clean up: remove the temporary directory
    fs.rmSync(tempDir, { recursive: true });
    fs.rmSync(externalTempDir, { recursive: true });
  });

  it('handles valid files', () => {
    fs.writeFileSync(path.join(tempDir, testFileName), testFileContent);
    const result = loadConfigDir(tempDir);
    expect(result).toEqual(testFileContentObject);
  });

  it('handles valid symlinks', () => {
    fs.writeFileSync(path.join(externalTempDir, testLinkName), testFileContent);
    fs.symlinkSync(path.join(externalTempDir, testLinkName), path.join(tempDir, testFileName));
    const result = loadConfigDir(tempDir);
    expect(result).toEqual(testFileContentObject);
  });
  it('errors on invalid files', () => {
    fs.symlinkSync('/non/existent/file.txt', path.join(tempDir, testFileName));
    const t = () => loadConfigDir(tempDir);
    expect(t).toThrowError();
  });
});
