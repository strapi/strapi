'use strict';

const { format } = require('winston');

module.exports = format((info) => {
  if (info instanceof Error) {
    return { ...info, message: `${info.message}${info.stack ? `\n${info.stack}` : ''}` };
  }

  return info;
});
