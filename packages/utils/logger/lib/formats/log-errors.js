'use strict';

const { format } = require('winston');

module.exports = format(info => {
  if (info instanceof Error) {
    info.message = `${info.message}\n${info.stack}`;
  }

  return info;
});
