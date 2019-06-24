'use strict';

const { pick } = require('lodash');
const slugify = require('@sindresorhus/slugify');

const VALID_FIELDS = ['name', 'connection', 'collectionName', 'attributes'];

const createSchema = infos => {
  const { name, connection = 'default', collectionName } = infos;
  const uid = createGroupUID(name);

  return {
    name,
    connection,
    collectionName: collectionName || uid,
    attributes: {},
  };
};

const updateSchema = (oldSchema, newSchema) =>
  pick({ ...oldSchema, ...newSchema }, VALID_FIELDS);

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
};
