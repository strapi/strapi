'use strict';

const path = require('path');
const dotenv = require('dotenv');
const fs = require('node:fs/promises');
const stripAnsi = require('strip-ansi');

const normalizeLineEndings = (str) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const trimLines = (str) => {
  const lines = normalizeLineEndings(str)
    .split('\n')
    .map((line) => stripAnsi(line).trim());

  // Remove leading empty lines
  while (lines.length > 0 && lines[0].length === 0) {
    lines.shift();
  }

  // Remove trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1].length === 0) {
    lines.pop();
  }

  // TODO: FIXME this is a workaround to fix the malformed �� sequences cliTable.toString() produces instead of dashes
  // Filter out lines that do not contain any alphanumeric characters
  return lines.filter((line) => /[a-zA-Z0-9]/.test(line));
};

const expectConsoleLinesToEqual = (received, expected) => {
  const receivedLines = trimLines(received);
  const expectedLines = trimLines(expected);

  expect(receivedLines).toEqual(expectedLines);
};

const expectConsoleLinesToInclude = (received, expected) => {
  const receivedLines = trimLines(received);
  const expectedLines = trimLines(expected);

  expectedLines.forEach((line) => {
    expect(receivedLines).toContain(line);
  });
};

/**
 * Load environment variables from a test app's .env file
 * This ensures consistent environment setup for both browser and CLI tests
 * when loading Strapi directly (not as a server process)
 *
 * @param {string} appPath - Path to the test app directory
 * @returns {Promise<void>}
 */
const loadTestAppEnv = async (appPath) => {
  const envPath = path.join(appPath, '.env');
  try {
    await fs.access(envPath);
    // Load .env file into process.env
    dotenv.config({ path: envPath });
  } catch (err) {
    // .env file doesn't exist, which is okay - use defaults
    // Set default values if .env doesn't exist
    if (!process.env.APP_KEYS) {
      process.env.APP_KEYS = 'test-key-1,test-key-2,test-key-3,test-key-4';
    }
    if (!process.env.ADMIN_JWT_SECRET) {
      process.env.ADMIN_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    }
    if (!process.env.API_TOKEN_SALT) {
      process.env.API_TOKEN_SALT = 'test-api-token-salt';
    }
    if (!process.env.TRANSFER_TOKEN_SALT) {
      process.env.TRANSFER_TOKEN_SALT = 'test-transfer-token-salt';
    }
  }
};

module.exports = {
  expectConsoleLinesToEqual,
  expectConsoleLinesToInclude,
  loadTestAppEnv,
};
