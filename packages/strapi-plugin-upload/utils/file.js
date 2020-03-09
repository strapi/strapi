'use strict';
/**
 * Utils file containing file treatment utils
 */

const bytesToKbytes = bytes => Math.round((bytes / 1000) * 100) / 100;

module.exports = {
  bytesToKbytes,
};
