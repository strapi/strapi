'use strict';

const { keys, sortBy, omit, map, isUndefined } = require('lodash/fp');
const { joinBy, setCreatorFields } = require('@strapi/utils');
const { FOLDER_MODEL_UID, FILE_MODEL_UID } = require('../constants');
const { getService } = require('../utils');

const setPathIdAndPath = async (folder) => {
  const { max } = await strapi.db.queryBuilder(FOLDER_MODEL_UID).max('pathId').first().execute();

  const pathId = max + 1;
  let parentPath = '/';
  if (folder.parent) {
    const parentFolder = await strapi.entityService.findOne(FOLDER_MODEL_UID, folder.parent);
    parentPath = parentFolder.path;
  }

  return Object.assign(folder, {
    pathId,
    path: joinBy('/', parentPath, pathId),
  });
};

const create = async (folderData, { user } = {}) => {
  const folderService = getService('folder');

  let enrichedFolder = await folderService.setPathIdAndPath(folderData);
  if (user) {
    enrichedFolder = await setCreatorFields({ user })(enrichedFolder);
  }

  const folder = await strapi.entityService.create(FOLDER_MODEL_UID, { data: enrichedFolder });

  return folder;
};

/**
 * Recursively delete folders and included files
 * @param ids ids of the folders to delete
 * @returns {Promise<Object[]>}
 */
const deleteByIds = async (ids = []) => {
  const folders = await strapi.db.query(FOLDER_MODEL_UID).findMany({ where: { id: { $in: ids } } });
  if (folders.length === 0) {
    return {
      folders: [],
      totalFolderNumber: 0,
      totalFileNumber: 0,
    };
  }

  const pathsToDelete = map('path', folders);

  // delete files
  const filesToDelete = await strapi.db.query(FILE_MODEL_UID).findMany({
    where: {
      $or: pathsToDelete.map((path) => ({ folderPath: { $startsWith: path } })),
    },
  });

  await Promise.all(filesToDelete.map((file) => getService('upload').remove(file)));

  // delete folders
  const { count: totalFolderNumber } = await strapi.db.query(FOLDER_MODEL_UID).deleteMany({
    where: {
      $or: pathsToDelete.map((path) => ({ path: { $startsWith: path } })),
    },
  });

  return {
    folders,
    totalFolderNumber,
    totalFileNumber: filesToDelete.length,
  };
};

/**
 * Update name and location of a folder and its belonging folders and files
 * @param params query params to find the folder
 * @returns {Promise<boolean>}
 */
const update = async (id, { name, parent }, { user }) => {
  // only name is updated
  if (isUndefined(parent)) {
    const existingFolder = await strapi.entityService.findOne(FOLDER_MODEL_UID, id);

    if (!existingFolder) {
      return undefined;
    }

    const newFolder = setCreatorFields({ user, isEdition: true })({ name, parent });

    if (isUndefined(parent)) {
      const folder = await strapi.entityService.update(FOLDER_MODEL_UID, id, { data: newFolder });
      return folder;
    }
    // location is updated => using transaction
  } else {
    const trx = await strapi.db.transaction();
    try {
      // fetch existing folder
      const existingFolder = await strapi.db
        .queryBuilder(FOLDER_MODEL_UID)
        .select(['pathId', 'path'])
        .where({ id })
        .transacting(trx)
        .forUpdate()
        .first()
        .execute();

      // update parent folder (delete + insert; upsert not possible)
      const { joinTable } = strapi.db.metadata.get(FOLDER_MODEL_UID).attributes.parent;
      await strapi.db
        .queryBuilder(joinTable.name)
        .transacting(trx)
        .delete()
        .where({ [joinTable.joinColumn.name]: id })
        .execute();

      if (parent !== null) {
        await strapi.db
          .queryBuilder(joinTable.name)
          .transacting(trx)
          .insert({ [joinTable.inverseJoinColumn.name]: parent, [joinTable.joinColumn.name]: id })
          .where({ [joinTable.joinColumn.name]: id })
          .execute();
      }

      // fetch destinationFolder path
      let destinationFolderPath = '/';
      if (parent !== null) {
        const destinationFolder = await strapi.db
          .queryBuilder(FOLDER_MODEL_UID)
          .select('path')
          .where({ id: parent })
          .transacting(trx)
          .first()
          .execute();
        destinationFolderPath = destinationFolder.path;
      }

      const folderTable = strapi.getModel(FOLDER_MODEL_UID).collectionName;
      const fileTable = strapi.getModel(FILE_MODEL_UID).collectionName;
      const folderPathColumnName =
        strapi.db.metadata.get(FILE_MODEL_UID).attributes.folderPath.columnName;
      const pathColumnName = strapi.db.metadata.get(FOLDER_MODEL_UID).attributes.path.columnName;

      // update folders below
      await strapi.db
        .connection(folderTable)
        .transacting(trx)
        .where(pathColumnName, existingFolder.path)
        .orWhere(pathColumnName, 'like', `${existingFolder.path}/%`)
        .update(
          pathColumnName,
          strapi.db.connection.raw('REPLACE(??, ?, ?)', [
            pathColumnName,
            existingFolder.path,
            joinBy('/', destinationFolderPath, existingFolder.pathId),
          ])
        );

      // update files below
      await strapi.db
        .connection(fileTable)
        .transacting(trx)
        .where(folderPathColumnName, existingFolder.path)
        .orWhere(folderPathColumnName, 'like', `${existingFolder.path}/%`)
        .update(
          folderPathColumnName,
          strapi.db.connection.raw('REPLACE(??, ?, ?)', [
            folderPathColumnName,
            existingFolder.path,
            joinBy('/', destinationFolderPath, existingFolder.pathId),
          ])
        );

      await trx.commit();
    } catch (e) {
      await trx.rollback();
      throw e;
    }

    // update less critical information (name + updatedBy)
    const newFolder = setCreatorFields({ user, isEdition: true })({ name });
    const folder = await strapi.entityService.update(FOLDER_MODEL_UID, id, { data: newFolder });
    return folder;
  }
};

/**
 * Check if a folder exists in database
 * @param params query params to find the folder
 * @returns {Promise<boolean>}
 */
const exists = async (params = {}) => {
  const count = await strapi.query(FOLDER_MODEL_UID).count({ where: params });
  return count > 0;
};

/**
 * Returns the nested structure of folders
 * @returns {Promise<array>}
 */
const getStructure = async () => {
  const { joinTable } = strapi.db.metadata.get(FOLDER_MODEL_UID).attributes.parent;
  const qb = strapi.db.queryBuilder(FOLDER_MODEL_UID);
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
  create,
  exists,
  deleteByIds,
  update,
  setPathIdAndPath,
  getStructure,
};
