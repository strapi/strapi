'use strict';

/**
 * Utils file containing file treatment utils
 */
const { Writable } = require('stream');

const bytesToKbytes = bytes => Math.round((bytes / 1000) * 100) / 100;
const kbytesToBytes = kbytes => kbytes * 1000;

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    stream.on('error', reject);
  });

const getStreamSize = (stream) =>
  new Promise((resolve, reject) => {
    let size = 0;
    stream.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
    });
    stream.on('close', () => resolve(size));
    stream.on('error', reject);
    stream.resume();
  });

/**
 * Create a writeable Node.js stream that discards received data.
 * Useful for testing, draining a stream of data, etc.
 */
function writableDiscardStream(options) {
  return new Writable({
    ...options,
    write(chunk, encding, callback) {
      setImmediate(callback);
    },
  });
}

module.exports = {
  streamToBuffer,
  bytesToKbytes,
  kbytesToBytes,
  getStreamSize,
  writableDiscardStream,
};
