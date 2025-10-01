'use strict';

const fs = require('node:fs/promises');
const path = require('path');

/**
 * Check if a path exists
 */
const pathExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Read a file and return its contents as a string
 */
const readFile = async (filePath) => {
  return (await fs.readFile(filePath)).toString();
};

/**
 * Write content to a file
 */
const writeFile = async (filePath, content) => {
  await fs.writeFile(filePath, content);
};

/**
 * Read directory contents
 */
const readDir = async (dirPath) => {
  return await fs.readdir(dirPath);
};

/**
 * Create directory if it doesn't exist
 */
const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // Directory might already exist, ignore error
  }
};

/**
 * Remove file or directory
 */
const remove = async (filePath) => {
  const { rimraf } = require('rimraf');
  await rimraf(filePath);
};

module.exports = {
  pathExists,
  readFile,
  writeFile,
  readDir,
  ensureDir,
  remove,
};
