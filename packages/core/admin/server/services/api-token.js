'use strict';

/**
 * @typedef {import('@strapi/admin').AdminApiToken} AdminApiToken
 */

const crypto = require('crypto');

/** @constant {Array<string>} */
const SELECT_FIELDS = ['id', 'name', 'description', 'type'];

/**
 * @param {Object} whereParams
 * @param {string} [whereParams.id]
 * @param {string} [whereParams.name]
 * @param {string} [whereParams.description]
 * @param {string} [whereParams.accessKey]
 */
const exists = async (whereParams = {}) => {
  const apiToken = await getBy(whereParams);

  return !!apiToken;
};

/**
 * @param {string} accessKey
 */
const hash = accessKey => {
  return crypto
    .createHmac('sha512', strapi.config.get('server.admin.api-token.salt'))
    .update(accessKey)
    .digest('hex');
};

/**
 * @param {Object} attributes
 * @param {AdminApiToken} attributes.type
 * @param {string} attributes.name
 * @param {string} [attributes.description]
 */
const create = async attributes => {
  const accessKey = crypto.randomBytes(128).toString('hex');

  const apiToken = await strapi.query('admin::api-token').create({
    // @ts-ignore
    select: SELECT_FIELDS,
    // @ts-ignore
    data: {
      ...attributes,
      accessKey: hash(accessKey),
    },
  });

  return {
    ...apiToken,
    accessKey,
  };
};

const createSaltIfNotDefined = () => {
  if (strapi.config.get('server.admin.api-token.salt')) {
    return;
  }

  if (process.env.API_TOKEN_SALT) {
    throw new Error(
      `There's something wrong with the configuration of your api-token salt. If you have changed the env variable used in the configuration file, please verify that you have created and set the variable in your .env file.`
    );
  }

  const salt = crypto.randomBytes(16).toString('hex');
  strapi.fs.appendFile('.env', `API_TOKEN_SALT=${salt}\n`);
  strapi.config.set('server.admin.api-token.salt', salt);
};

const list = async () => {
  return strapi.query('admin::api-token').findMany({
    // @ts-ignore
    select: SELECT_FIELDS,
    orderBy: { name: 'ASC' },
  });
};

/**
 * @param {string} id
 */
const revoke = async id => {
  return strapi.query('admin::api-token').delete({
    // @ts-ignore

    select: SELECT_FIELDS,
    where: { id },
  });
};

/**
 * @param {string} id
 */
const getById = async id => {
  return getBy({ id });
};

/**
 * @param {string} name
 */
const getByName = async name => {
  return getBy({ name });
};

/**
 * @param {string} id
 * @param {Object} attributes
 * @param {AdminApiToken['type']} attributes.type
 * @param {string} attributes.name
 * @param {string} [attributes.description]
 */
const update = async (id, attributes) => {
  return strapi.query('admin::api-token').update({
    where: { id },
    data: attributes,
    //@ts-ignore
    select: SELECT_FIELDS,
  });
};

/**
 * @param {Object} whereParams
 * @param {string} [whereParams.id]
 * @param {string} [whereParams.name]
 * @param {string} [whereParams.description]
 * @param {string} [whereParams.accessKey]
 */
const getBy = async (whereParams = {}) => {
  if (Object.keys(whereParams).length === 0) {
    return null;
  }

  return strapi.query('admin::api-token').findOne({
    //@ts-ignore
    select: SELECT_FIELDS,
    //@ts-ignore
    where: whereParams,
  });
};

module.exports = {
  create,
  exists,
  createSaltIfNotDefined,
  hash,
  list,
  revoke,
  getById,
  update,
  getByName,
  getBy,
};
