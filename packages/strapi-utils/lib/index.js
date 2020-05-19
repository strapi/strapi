'use strict';

/**
 * Export shared utilities
 */

const convertRestQueryParams = require('./convertRestQueryParams');
const buildQuery = require('./buildQuery');
const parseMultipartData = require('./parse-multipart');
const sanitizeEntity = require('./sanitize-entity');
const parseType = require('./parse-type');
const finder = require('./finder');
const logger = require('./logger');
const models = require('./models');
const policy = require('./policy');
const templateConfiguration = require('./templateConfiguration');
const { yup, formatYupErrors } = require('./validators');
const {
  nameToSlug,
  nameToCollectionName,
  getCommonBeginning,
  escapeQuery,
} = require('./stringFormatting');
const { removeUndefined } = require('./objectFormatting');
const { getConfigUrls, getAbsoluteAdminUrl, getAbsoluteServerUrl } = require('./config');
const findPageQueryFactory = require('./findPageQueryFactory');

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
  findPageQueryFactory,
};
