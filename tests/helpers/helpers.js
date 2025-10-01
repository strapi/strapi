'use strict';

const path = require('path');
const execa = require('execa');

/**
 * Execute a command with proper error handling
 */
const executeCommand = async (command, args = [], options = {}) => {
  try {
    const result = await execa(command, args, {
      stdio: 'inherit',
      ...options,
    });
    return result;
  } catch (error) {
    console.error(`Error executing ${command}:`, error.message);
    throw error;
  }
};

/**
 * Execute a command and return the output
 */
const executeCommandWithOutput = async (command, args = [], options = {}) => {
  try {
    const result = await execa(command, args, {
      stdio: 'pipe',
      ...options,
    });
    return result.stdout;
  } catch (error) {
    console.error(`Error executing ${command}:`, error.message);
    throw error;
  }
};

/**
 * Wait for a condition to be true
 */
const waitFor = async (condition, timeout = 30000, interval = 1000) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Wait for a server to be ready by checking an endpoint
 */
const waitForServer = async (url, timeout = 30000) => {
  return waitFor(async () => {
    try {
      const response = await fetch(url);
      return response.ok;
    } catch (err) {
      return false;
    }
  }, timeout);
};

/**
 * Generate a random port number
 */
const getRandomPort = () => {
  return Math.floor(Math.random() * (65535 - 8000)) + 8000;
};

/**
 * Check if a port is available
 */
const isPortAvailable = async (port) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/_health`);
    return false; // Port is in use
  } catch (err) {
    return true; // Port is available
  }
};

/**
 * Find an available port starting from a base port
 */
const findAvailablePort = async (basePort = 8000) => {
  let port = basePort;
  while (port < 65535) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error('No available ports found');
};

/**
 * Create a temporary directory path
 */
const createTempDir = (baseDir, prefix = 'test-') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return path.join(baseDir, `${prefix}${timestamp}-${random}`);
};

/**
 * Clean up temporary files and directories
 */
const cleanup = async (paths) => {
  const { rimraf } = require('rimraf');
  await Promise.all(paths.map((p) => rimraf(p).catch(() => {})));
};

module.exports = {
  executeCommand,
  executeCommandWithOutput,
  waitFor,
  waitForServer,
  getRandomPort,
  isPortAvailable,
  findAvailablePort,
  createTempDir,
  cleanup,
};
