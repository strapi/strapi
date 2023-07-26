'use strict';

const { ThrottleGroup } = require('stream-throttle');

const THROTTLE_MB_MULTIPLIER = 1024 * 1024;

const tg = new ThrottleGroup({
  // Rate in bytes per second  e.g 10240 = 10KB/s.
  rate: 100 * THROTTLE_MB_MULTIPLIER, // 100 MB/s
});

const throttle = async (file) => {
  return {
    ...file,
    getStream: () => file.getStream().pipe(tg.throttle()),
  };
};

module.exports = throttle;
