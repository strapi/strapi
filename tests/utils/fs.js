'use strict';

const path = require('node:path');
const { pipeline } = require('node:stream');
const fs = require('node:fs');
const zlib = require('node:zlib');
const { parser: jsonlParser } = require('stream-json/jsonl/Parser');
const { chain } = require('stream-chain');
const tar = require('tar');

// COLLECTORS

/**
 * Collects and buffers data from a Readable stream.
 *
 * @param {import('stream').PassThrough} entry - The Readable stream from which to collect data.
 * @returns {Promise<Buffer[]>} A promise that resolves with an array of buffers containing the collected data.
 */
const rawCollector = (entry) => {
  /**
   * @type {Buffer[]}
   */
  const chunks = [];

  return new Promise((resolve, reject) => {
    entry
      .on('data', (data) => {
        chunks.push(data);
      })
      .on('error', reject)
      .on('end', () => resolve(chunks));
  });
};

/**
 * Collects a string from the given entry using a raw collector.
 *
 * @param {import('stream').PassThrough} entry - The entry to collect the string from.
 * @returns {Promise<string>} - A Promise that resolves to the collected string.
 */
const stringCollector = async (entry) => {
  return await rawCollector(entry).then((chunks) => chunks.map((chunk) => chunk.toString()).join());
};

/**
 * Collects and processes JSONL data from a given entry.
 *
 * @param {import('stream').PassThrough} entry - The entry to collect JSONL data from.
 * @returns {Promise<unknown[]>} A promise that resolves to the collected data.
 */
const jsonlCollector = async (entry) => {
  const transforms = [
    // JSONL parser to read the data chunks one by one (line by line)
    jsonlParser({ checkErrors: true }),
    // The JSONL parser returns each line as key/value
    (line) => line.value,
  ];

  const stream = entry.pipe(chain(transforms));

  return rawCollector(stream);
};

/**
 * Asynchronously collects the content of an entry and converts it to JSON format.
 *
 * @param {import('stream').PassThrough} entry - The entry to collect the content from.
 * @returns {Promise} A promise that resolves to the content of the entry in JSON format.
 */
const jsonCollector = async (entry) => {
  return await stringCollector(entry).then((content) => JSON.parse(content));
};

// FILES

/**
 * Reads a file from an archive.
 *
 * @param {string} archive - The path to the archive file.
 * @param {string} file - The name of the file to read.
 * @param {Object} [options={}] - Additional options.
 * @param {Function} [options.collector=stringCollector] - A function to collect the content of the file.
 * @returns {Promise<string>} - The content of the file.
 * @throws {Error} - If the file is not found in the archive.
 */
const readFile = async (archive, file, options = {}) => {
  const { collector = stringCollector } = options;

  // Check if the file is a .tar.gz
  const isGzipped = archive.endsWith('.tar.gz');
  let content = undefined;

  await new Promise((resolve, reject) => {
    const streams = [fs.createReadStream(archive)];

    // If the file is gzipped, add a decompression step
    if (isGzipped) {
      streams.push(zlib.createGunzip());
    }

    streams.push(
      // Transform: tar parser
      new tar.Parse({
        // Match tar entry with the given filename
        filter: (filePath, entry) => {
          console.log(filePath);
          return entry.type === 'File' && file === filePath;
        },
        async onentry(entry) {
          content = await collector(entry);
        },
      })
    );

    pipeline(streams, (err) => (err ? reject(err) : resolve()));
  });

  if (content === undefined) {
    throw new Error(`File not found: ${file} in ${archive}`);
  }

  return content;
};

/**
 * Reads a JSON Lines file from an archive.
 *
 * @param {string} archive - The archive to read from.
 * @param {string} file - The JSON Lines file to read.
 * @returns {Promise<any>} - A promise that will resolve to the content of the JSON Lines file.
 */
const readJSONLFile = async (archive, file) => {
  return readFile(archive, file, { collector: jsonlCollector });
};

/**
 * Reads a JSON file from an archive.
 *
 * @param {string} archive - The name of the archive.
 * @param {string} file - The name of the JSON file.
 * @returns {Promise} - A promise that resolves to the JSON data.
 */
const readJSONFile = async (archive, file) => {
  return readFile(archive, file, { collector: jsonCollector });
};

// DIRECTORIES

/**
 * Read and retrieve files from a specific directory in a TAR archive.
 *
 * @param {string} archive - The path to the TAR archive.
 * @param {string} dir - The directory path inside the archive.
 * @returns {Promise<string[]>} - A promise that resolves with an array of filenames in the specified directory.
 */
const readDir = async (archive, dir) => {
  /**
   * @type {string[]}
   */
  const files = [];
  const isGzipped = archive.endsWith('.tar.gz');

  await new Promise((resolve, reject) => {
    const streams = [fs.createReadStream(archive)];
    if (isGzipped) {
      streams.push(zlib.createGunzip());
    }

    // Add the tar parser
    streams.push(
      new tar.Parse({
        // Match tar entry with the given filename
        filter: (filePath, entry) => entry.type === 'File' && dir === path.dirname(filePath),
        // Set outStream to
        async onentry(entry) {
          files.push(path.basename(entry.path));

          // Consume the entry anyway to avoid blocking the tar parser
          await rawCollector(entry);
        },
      })
    );

    pipeline(streams, (err) => (err ? reject(err) : resolve()));
  });

  return files;
};

const readJSONLDir = async (archive, dir) => {
  const files = await readDir(archive, dir);

  const filesContent = await Promise.all(
    files
      // Prefix paths with the directory name
      .map((file) => path.join(dir, file))
      // Read files content as JSONL
      .map((file) => readJSONLFile(archive, file))
  );

  // Flatten the results to a single JSON collection
  return filesContent.flat();
};

module.exports = {
  // Files
  readFile,
  readJSONFile,
  readJSONLFile,
  // Directories
  readDir,
  readJSONLDir,

  tar: (archive) => ({
    // Files
    readFile: (file) => readFile(archive, file),
    readJSONLFile: (file) => readJSONLFile(archive, file),
    readJSONFile: (file) => readJSONFile(archive, file),
    // Directories
    readDir: (dir) => readDir(archive, dir),
    readJSONLDir: (dir) => readJSONLDir(archive, dir),
  }),
};
