'use strict';

/**
 * Export shared utilities
 */
const convertRestQueryParams = require('./convert-rest-query-params');
const buildQuery = require('./build-query');
const parseMultipartData = require('./parse-multipart');
const sanitizeEntity = require('./sanitize-entity');
const parseType = require('./parse-type');
const finder = require('./finder');
const logger = require('./logger');
const models = require('./models');
const policy = require('./policy');
const templateConfiguration = require('./template-configuration');
const { yup, formatYupErrors } = require('./validators');
const {
  nameToSlug,
  nameToCollectionName,
  getCommonBeginning,
  escapeQuery,
  stringIncludes,
  stringEquals,
} = require('./string-formatting');
const { removeUndefined } = require('./object-formatting');
const { getConfigUrls, getAbsoluteAdminUrl, getAbsoluteServerUrl } = require('./config');
const { generateTimestampCode } = require('./code-generator');

module.exports = {
  yup,
  formatYupErrors,
  finder,
  logger,
  models,
  policy,
  templateConfiguration,
  convertRestQueryParams,
  buildQuery,
  parseMultipartData,
  sanitizeEntity,
  parseType,
  nameToSlug,
  nameToCollectionName,
  getCommonBeginning,
  getConfigUrls,
  escapeQuery,
  removeUndefined,
  getAbsoluteAdminUrl,
  getAbsoluteServerUrl,
  generateTimestampCode,
  stringIncludes,
  stringEquals,
};
