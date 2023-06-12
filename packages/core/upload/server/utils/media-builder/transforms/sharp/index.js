'use strict';

const sharp = require('sharp');
const autoRotate = require('./auto-rotate');
const breakpoints = require('./breakpoints');
const metadata = require('./metadata');
const optimize = require('./optimize');
const thumbnail = require('./thumbnail');

// set all necessary sharp options here to reduce ram usage
sharp.concurrency(1);
sharp.cache(false);
// set VIPS_DISC_THRESHOLD to 50 megs
// VIPS_DISC_THRESHOLD=50m

module.exports = {
  autoRotate,
  breakpoints,
  metadata,
  optimize,
  thumbnail,
};
