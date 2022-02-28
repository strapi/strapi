'use strict';
/**
 * Utils file containing file treatment utils
 */

const bytesToKbytes = bytes => Math.round((bytes / 1000) * 100) / 100;

const streamToBuffer = stream =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => {
      chunks.push(chunk);
    });
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    stream.on('error', reject);
  });

const getStreamSize = stream =>
  new Promise((resolve, reject) => {
    let size = 0;
    stream.on('data', chunk => (size += Buffer.byteLength(chunk)));
    stream.on('close', () => resolve(size));
    stream.on('error', reject);
    stream.resume();
  });

module.exports = {
  streamToBuffer,
  bytesToKbytes,
  getStreamSize,
};
