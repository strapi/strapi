'use strict';

const uuid = require('uuid').v4;
const { keys, sortBy, omit, map } = require('lodash/fp');
const { joinBy } = require('@strapi/utils');
const { getService } = require('../utils');

const folderModel = 'plugin::upload.folder';
const fileModel = 'plugin::upload.file';

const generateUID = () => uuid();

const setPathAndUID = async folder => {
  const uid = generateUID();
  let parentPath = '/';
  if (folder.parent) {
    const parentFolder = await strapi.entityService.findOne(folderModel, folder.parent);
    parentPath = parentFolder.path;
  }

  return Object.assign(folder, {
    uid,
    path: joinBy('/', parentPath, uid),
  });
};

/**
 * Recursively delete folders and included files
 * @param ids ids of the folders to delete
 * @returns {Promise<Object[]>}
 */
const deleteByIds = async (ids = []) => {
  const folders = await strapi.db.query(folderModel).findMany({ where: { id: { $in: ids } } });
  if (folders.length === 0) {
    return [];
  }

  const pathsToDelete = map('path', folders);

  // delete files
  const filesToDelete = await strapi.db.query(fileModel).findMany({
    where: {
      $or: pathsToDelete.map(path => ({ folderPath: { $startsWith: path } })),
    },
  });

  await Promise.all(filesToDelete.map(file => getService('upload').remove(file)));

  // delete folders
  await strapi.db.query(folderModel).deleteMany({
    where: {
      $or: pathsToDelete.map(path => ({ path: { $startsWith: path } })),
    },
  });

  return folders;
};

/**
 * Check if a folder exists in database
 * @param params query params to find the folder
 * @returns {Promise<boolean>}
 */
const exists = async (params = {}) => {
  const count = await strapi.query(folderModel).count({ where: params });
  return count > 0;
};

const getStructure = async () => {
  const joinTable = strapi.db.metadata.get('plugin::upload.folder').attributes.parent.joinTable;
  const qb = strapi.db.queryBuilder('plugin::upload.folder');
  const alias = qb.getAlias();
  const folders = await qb
    .select(['id', 'name', `${alias}.${joinTable.inverseJoinColumn.name} as parent`])
    .join({
      alias,
      referencedTable: joinTable.name,
      referencedColumn: joinTable.joinColumn.name,
      rootColumn: joinTable.joinColumn.referencedColumn,
      rootTable: qb.alias,
    })
    .execute({ mapResults: false });

  const folderMap = folders.reduce((map, f) => {
    f.children = [];
    map[f.id] = f;
    return map;
  }, {});
  folderMap.null = { children: [] };

  for (const id of keys(omit('null', folderMap))) {
    const parentId = folderMap[id].parent;
    folderMap[parentId].children.push(folderMap[id]);
    folderMap[parentId].children = sortBy('name', folderMap[parentId].children);
    delete folderMap[id].parent;
  }

  return folderMap.null.children;
};

module.exports = {
  exists,
  deleteByIds,
  setPathAndUID,
  getStructure,
};
