import { sortBy, map, isUndefined } from 'lodash/fp';
import { strings, setCreatorFields } from '@strapi/utils';
import { FOLDER_MODEL_UID, FILE_MODEL_UID } from '../constants';
import { getService } from '../utils';

import type { File, Folder } from '../types';

type FolderMap = {
  [key: string]: Partial<Folder> & {
    children: FolderNode[];
  };
};

type FolderNode = Partial<Folder> & {
  children: FolderNode[];
};

const setPathIdAndPath = async (folder: Pick<Folder, 'parent'>) => {
  const { max } = await strapi.db
    .queryBuilder(FOLDER_MODEL_UID)
    .max('pathId')
    .first()
    .execute<{ max: number }>();

  const pathId = max + 1;
  let parentPath = '/';
  if (folder.parent) {
    const parentFolder = await strapi.db
      .query(FOLDER_MODEL_UID)
      .findOne({ where: { id: folder.parent } });

    parentPath = parentFolder.path;
  }

  return Object.assign(folder, {
    pathId,
    path: strings.joinBy('/', parentPath, `${pathId}`),
  });
};

const create = async (
  folderData: Pick<Folder, 'name' | 'parent'>,
  opts?: { user: { id: string | number } }
) => {
  const folderService = getService('folder');

  const { user } = opts || {};

  let enrichedFolder = await folderService.setPathIdAndPath(folderData);
  if (user) {
    enrichedFolder = await setCreatorFields({ user })(enrichedFolder);
  }

  const folder = await strapi.db.query(FOLDER_MODEL_UID).create({ data: enrichedFolder });

  strapi.eventHub.emit('media-folder.create', { folder });

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
      $or: pathsToDelete.flatMap((path) => [
        { folderPath: { $eq: path } },
        { folderPath: { $startsWith: `${path}/` } },
      ]),
    },
  });

  await Promise.all(filesToDelete.map((file: File) => getService('upload').remove(file)));

  // delete folders and subfolders
  const { count: totalFolderNumber } = await strapi.db.query(FOLDER_MODEL_UID).deleteMany({
    where: {
      $or: pathsToDelete.flatMap((path) => [
        { path: { $eq: path } },
        { path: { $startsWith: `${path}/` } },
      ]),
    },
  });

  strapi.eventHub.emit('media-folder.delete', { folders });

  return {
    folders,
    totalFolderNumber,
    totalFileNumber: filesToDelete.length,
  };
};

/**
 * Update name and location of a folder and its belonging folders and files
 */
const update = async (
  id: number,
  {
    name,
    parent,
  }: {
    name: string;
    parent: number | null;
  },
  { user }: { user: { id: string | number } }
) => {
  // only name is updated
  if (isUndefined(parent)) {
    const existingFolder = await strapi.db.query(FOLDER_MODEL_UID).findOne({ where: { id } });

    if (!existingFolder) {
      return undefined;
    }

    const newFolder = setCreatorFields({ user, isEdition: true })({ name, parent });

    if (isUndefined(parent)) {
      const folder = await strapi.db
        .query(FOLDER_MODEL_UID)
        .update({ where: { id }, data: newFolder });

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
        .transacting(trx.get())
        .forUpdate()
        .first()
        .execute<Folder>();

      // update parent folder (delete + insert; upsert not possible)
      // @ts-expect-error - no dynamic types
      const { joinTable } = strapi.db.metadata.get(FOLDER_MODEL_UID).attributes.parent;
      await strapi.db
        .queryBuilder(joinTable.name)
        .transacting(trx.get())
        .delete()
        .where({ [joinTable.joinColumn.name]: id })
        .execute();

      if (parent !== null) {
        await strapi.db
          .queryBuilder(joinTable.name)
          .transacting(trx.get())
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
          .transacting(trx.get())
          .first()
          .execute<Folder>();
        destinationFolderPath = destinationFolder.path;
      }

      const folderTable = strapi.getModel(FOLDER_MODEL_UID).collectionName;
      const fileTable = strapi.getModel(FILE_MODEL_UID).collectionName;
      const folderPathColumnName =
        // @ts-expect-error - no dynamic types
        strapi.db.metadata.get(FILE_MODEL_UID).attributes.folderPath.columnName;
      // @ts-expect-error - no dynamic types
      const pathColumnName = strapi.db.metadata.get(FOLDER_MODEL_UID).attributes.path.columnName;

      // update folders below
      await strapi.db
        .getConnection(folderTable)
        .transacting(trx.get())
        .where(pathColumnName, existingFolder.path)
        .orWhere(pathColumnName, 'like', `${existingFolder.path}/%`)
        .update(
          pathColumnName,
          strapi.db.connection.raw('REPLACE(??, ?, ?)', [
            pathColumnName,
            existingFolder.path,
            strings.joinBy('/', destinationFolderPath, `${existingFolder.pathId}`),
          ])
        );

      // update files below
      await strapi.db
        .getConnection(fileTable)
        .transacting(trx.get())
        .where(folderPathColumnName, existingFolder.path)
        .orWhere(folderPathColumnName, 'like', `${existingFolder.path}/%`)
        .update(
          folderPathColumnName,
          strapi.db.connection.raw('REPLACE(??, ?, ?)', [
            folderPathColumnName,
            existingFolder.path,
            strings.joinBy('/', destinationFolderPath, `${existingFolder.pathId}`),
          ])
        );

      await trx.commit();
    } catch (e) {
      await trx.rollback();
      throw e;
    }

    // update less critical information (name + updatedBy)
    const newFolder = setCreatorFields({ user, isEdition: true })({ name });

    const folder = await strapi.db
      .query(FOLDER_MODEL_UID)
      .update({ where: { id }, data: newFolder });

    strapi.eventHub.emit('media-folder.update', { folder });
    return folder;
  }
};

/**
 * Check if a folder exists in database
 * @param params query params to find the folder
 * @returns {Promise<boolean>}
 */
const exists = async (params = {}) => {
  const count = await strapi.db.query(FOLDER_MODEL_UID).count({ where: params });
  return count > 0;
};

/**
 * Returns the nested structure of folders
 * @returns {Promise<array>}
 */
const getStructure = async () => {
  // @ts-expect-error - no dynamic types
  const { joinTable } = strapi.db.metadata.get(FOLDER_MODEL_UID).attributes.parent;
  const qb = strapi.db.queryBuilder(FOLDER_MODEL_UID);
  const alias = qb.getAlias();
  const folders = (await qb
    .select(['id', 'name', `${alias}.${joinTable.inverseJoinColumn.name} as parent`])
    .join({
      alias,
      referencedTable: joinTable.name,
      referencedColumn: joinTable.joinColumn.name,
      rootColumn: joinTable.joinColumn.referencedColumn,
      rootTable: qb.alias,
    })
    .execute({ mapResults: false })) as Folder[];

  const folderMap: FolderMap = {
    null: { children: [] },
  };

  folders.forEach((f) => {
    folderMap[f.id] = { ...f, children: [] };
  });

  folders.forEach((f) => {
    const parentId = f.parent || 'null';

    if (!folderMap[parentId]) {
      folderMap[parentId] = { children: [] };
    }

    folderMap[parentId].children.push(folderMap[f.id]);
    folderMap[parentId].children = sortBy('name', folderMap[parentId].children);
    delete folderMap[f.id].parent;
  });

  return folderMap.null.children;
};

export default {
  create,
  exists,
  deleteByIds,
  update,
  setPathIdAndPath,
  getStructure,
};
