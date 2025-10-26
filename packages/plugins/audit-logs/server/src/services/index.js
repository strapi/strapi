'use strict';

const auditLog = require('./audit-log');
const contextResolver = require('./context-resolver');
const recordIdExtractor = require('./record-id-extractor');
const payloadBuilder = require('./payload-builder');
const logWriter = require('./log-writer');
const logReader = require('./log-reader');

module.exports = {
  'audit-log': auditLog,
  'context-resolver': contextResolver,
  'record-id-extractor': recordIdExtractor,
  'payload-builder': payloadBuilder,
  'log-writer': logWriter,
  'log-reader': logReader,
};
