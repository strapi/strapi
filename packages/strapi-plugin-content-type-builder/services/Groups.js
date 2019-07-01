'use strict';

const { pick } = require('lodash');
const pluralize = require('pluralize');
const slugify = require('@sindresorhus/slugify');

const VALID_FIELDS = ['name', 'connection', 'collectionName', 'attributes'];

/**
 * Create a schema
 * @param {Object} infos
 */
const createSchema = infos => {
  const { name, connection = 'default', collectionName, attributes } = infos;
  const uid = createGroupUID(name);

  return {
    name,
    connection,
    collectionName: collectionName || pluralize(uid),
    // TODO: format attributes or sth
    attributes,
  };
};

/**
 * Update a group schema
 * @param {Object} currentSchema - current group schema
 * @param {Object} newSchema - new group schema
 */
const updateSchema = (currentSchema, newSchema) =>
  pick({ ...currentSchema, ...newSchema }, VALID_FIELDS);

/**
 * Returns a uid from a string
 * @param {string} str - string to slugify
 */
const createGroupUID = str => slugify(str, { separator: '_' });

/**
 * Creates a group schema file
 * @param {*} uid
 * @param {*} infos
 */
async function createGroup(uid, infos) {
  const schema = createSchema(infos);

  return writeSchema(uid, schema);
}

/**
 * Updates a group schema file
 * @param {*} group
 * @param {*} infos
 */
async function updateGroup(group, infos) {
  const { uid } = group;
  const updatedSchema = updateSchema(group.schema, infos);

  if (infos.name !== group.schema.name) {
    await deleteSchema(uid);

    const newUid = createGroupUID(infos.name);
    return writeSchema(newUid, updatedSchema);
  }

  return writeSchema(uid, updatedSchema);
}

/**
 * Deletes a group
 * @param {*} group
 */
async function deleteGroup(group) {
  await deleteSchema(group.uid);
  process.nextTick(() => strapi.reload());
}

/**
 * Writes a group schema file
 */
async function writeSchema(uid, schema) {
  strapi.reload.isWatching = false;

  await strapi.fs.writeAppFile(
    `groups/${uid}.json`,
    JSON.stringify(schema, null, 2)
  );

  strapi.reload.isWatching = true;
  process.nextTick(() => strapi.reload());

  return {
    uid,
    schema,
  };
}

/**
 * Deletes a group schema file
 * @param {string} ui
 */
async function deleteSchema(uid) {
  strapi.reload.isWatching = false;
  await strapi.fs.removeAppFile(`groups/${uid}.json`);
  strapi.reload.isWatching = true;
}

module.exports = {
  createGroup,
  createGroupUID,
  updateGroup,
  deleteGroup,

  // export for testing only
  createSchema,
  updateSchema,
};
