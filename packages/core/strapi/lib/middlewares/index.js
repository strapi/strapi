'use strict';

const compression = require('./compression');
const cors = require('./cors');
const errors = require('./errors');
const favicon = require('./favicon');
const ip = require('./ip');
const logger = require('./logger');
const poweredBy = require('./powered-by');
const body = require('./body');
const query = require('./query');
const responseTime = require('./response-time');
const responses = require('./responses');
const security = require('./security');
const session = require('./session');
const publicStatic = require('./public');

module.exports = {
  errors,
  ip,
  security,
  cors,
  responseTime,
  poweredBy,
  session,
  logger,
  compression,
  responses,
  body,
  query,
  favicon,
  public: publicStatic,
};
