import { errors, strings } from '@strapi/utils';

import type { Context } from 'koa';

import { getService } from '../utils';
import { ACTIONS, FOLDER_MODEL_UID, FILE_MODEL_UID } from '../constants';
import { FolderContainsUnauthorizedAssetsError } from '../errors';
import {
  validateDeleteManyFoldersFiles,
  validateMoveManyFoldersFiles,
} from './validation/admin/folder-file';

import type { File, Folder } from '../types';

export default {
  async deleteMany(ctx: Context) {
    const { body } = ctx.request;
    const {
      state: { userAbility },
    } = ctx;

    const pmFolder = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    const pmFile = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.update,
      model: FILE_MODEL_UID,
    });

    await validateDeleteManyFoldersFiles(body);

    const fileService = getService('file');
    const folderService = getService('folder');

    const { fileIds = [], folderIds = [] } = body;

    const canDeleteFiles = async (files: File[]) => {
      const ids = [...new Set(files.map(({ id }) => id))];

      if (ids.length === 0) {
        return true;
      }

      const query = pmFile.addPermissionsQueryTo({ filters: { id: { $in: ids } } });
      const permittedFiles = await strapi.db.query(FILE_MODEL_UID).findMany({
        select: ['id'],
        where: query.filters,
      });

      return permittedFiles.length === ids.length;
    };

    // https://github.com/strapi/strapi/issues/27649
    // Validate explicitly selected files before deleting a folder. Otherwise a mixed request
    // could delete permitted files first and only then discover a forbidden file in the folder.
    if (fileIds.length > 0) {
      const selectedFiles = await strapi.db.query(FILE_MODEL_UID).findMany({
        where: { id: { $in: fileIds } },
      });

      if (!(await canDeleteFiles(selectedFiles))) {
        throw new errors.ForbiddenError();
      }
    }

    const {
      folders: deletedFolders,
      totalFolderNumber,
      totalFileNumber,
    } = await folderService.deleteByIds(folderIds, {
      async validateFiles(files) {
        if (!(await canDeleteFiles(files))) {
          throw new FolderContainsUnauthorizedAssetsError();
        }
      },
    });
    const deletedFiles = await fileService.deleteByIds(fileIds);

    if (deletedFiles.length + deletedFolders.length > 1) {
      await getService('metrics').trackUsage('didBulkDeleteMediaLibraryElements', {
        eventProperties: {
          rootFolderNumber: deletedFolders.length,
          rootAssetNumber: deletedFiles.length,
          totalFolderNumber,
          totalAssetNumber: totalFileNumber + deletedFiles.length,
        },
      });
    }

    ctx.body = {
      data: {
        files: await pmFile.sanitizeOutput(deletedFiles, { action: ACTIONS.read }),
        folders: await pmFolder.sanitizeOutput(deletedFolders),
      },
    };
  },
  async moveMany(ctx: Context) {
    const { body } = ctx.request;
    const {
      state: { userAbility },
    } = ctx;

    const pmFolder = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    const pmFile = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.read,
      model: FILE_MODEL_UID,
    });

    await validateMoveManyFoldersFiles(body);
    const { folderIds = [], fileIds = [], destinationFolderId } = body;

    let totalFolderNumber = 0;
    let totalFileNumber = 0;

    const trx = await strapi.db.transaction();
    try {
      // fetch folders
      const existingFolders = await strapi.db
        .queryBuilder(FOLDER_MODEL_UID)
        .select(['id', 'pathId', 'path'])
        .where({ id: { $in: folderIds } })
        .transacting(trx.get())
        .forUpdate()
        .execute<Folder[]>();

      // fetch files
      const existingFiles = await strapi.db
        .queryBuilder(FILE_MODEL_UID)
        .select(['id'])
        .where({ id: { $in: fileIds } })
        .transacting(trx.get())
        .forUpdate()
        .execute<File[]>();

      // fetch destinationFolder path
      let destinationFolderPath = '/';
      if (destinationFolderId !== null) {
        const destinationFolder = await strapi.db
          .queryBuilder(FOLDER_MODEL_UID)
          .select('path')
          .where({ id: destinationFolderId })
          .transacting(trx.get())
          .first()
          .execute<Folder>();
        destinationFolderPath = destinationFolder.path;
      }

      const fileTable = strapi.getModel(FILE_MODEL_UID).collectionName;
      const folderTable = strapi.getModel(FOLDER_MODEL_UID).collectionName;
      const folderPathColName =
        // @ts-expect-error - no dynamic typings for the models
        strapi.db.metadata.get(FILE_MODEL_UID).attributes.folderPath.columnName;
      // @ts-expect-error - no dynamic typings for the models
      const pathColName = strapi.db.metadata.get(FOLDER_MODEL_UID).attributes.path.columnName;

      if (existingFolders.length > 0) {
        // update folders' parent relation
        // @ts-expect-error - no dynamic typings for the models
        const { joinTable } = strapi.db.metadata.get(FOLDER_MODEL_UID).attributes.parent;
        await strapi.db
          .queryBuilder(joinTable.name)
          .transacting(trx.get())
          .delete()
          .where({ [joinTable.joinColumn.name]: { $in: folderIds } })
          .execute();

        if (destinationFolderId !== null) {
          await strapi.db
            .queryBuilder(joinTable.name)
            .transacting(trx.get())
            .insert(
              existingFolders.map((folder) => ({
                [joinTable.inverseJoinColumn.name]: destinationFolderId,
                [joinTable.joinColumn.name]: folder.id,
              }))
            )
            .execute();
        }

        for (const existingFolder of existingFolders) {
          let replaceQuery;
          switch (strapi.db.dialect.client) {
            case 'sqlite':
              replaceQuery = '? || SUBSTRING(??, ?)';
              break;
            case 'postgres':
              replaceQuery = 'CONCAT(?::TEXT, SUBSTRING(??, ?::INTEGER))';
              break;
            default:
              replaceQuery = 'CONCAT(?, SUBSTRING(??, ?))';
          }

          // update path for folders themselves & folders below
          totalFolderNumber = await strapi.db
            .getConnection(folderTable)
            .transacting(trx.get())
            .where(pathColName, existingFolder.path)
            .orWhere(pathColName, 'like', `${existingFolder.path}/%`)
            .update(
              pathColName,
              strapi.db.connection.raw(replaceQuery, [
                strings.joinBy('/', destinationFolderPath, `${existingFolder.pathId}`),
                pathColName,
                existingFolder.path.length + 1,
              ])
            );

          // update path of files below
          totalFileNumber = await strapi.db
            .getConnection(fileTable)
            .transacting(trx.get())
            .where(folderPathColName, existingFolder.path)
            .orWhere(folderPathColName, 'like', `${existingFolder.path}/%`)
            .update(
              folderPathColName,
              strapi.db.connection.raw(replaceQuery, [
                strings.joinBy('/', destinationFolderPath, `${existingFolder.pathId}`),
                folderPathColName,
                existingFolder.path.length + 1,
              ])
            );
        }
      }

      if (existingFiles.length > 0) {
        // update files' folder relation (delete + insert; upsert not possible)
        // @ts-expect-error - no dynamic typings for the models
        const fileJoinTable = strapi.db.metadata.get(FILE_MODEL_UID).attributes.folder.joinTable;
        await strapi.db
          .queryBuilder(fileJoinTable.name)
          .transacting(trx.get())
          .delete()
          .where({ [fileJoinTable.joinColumn.name]: { $in: fileIds } })
          .execute();

        if (destinationFolderId !== null) {
          await strapi.db
            .queryBuilder(fileJoinTable.name)
            .transacting(trx.get())
            .insert(
              existingFiles.map((file) => ({
                [fileJoinTable.inverseJoinColumn.name]: destinationFolderId,
                [fileJoinTable.joinColumn.name]: file.id,
              }))
            )
            .execute();
        }

        // update files main fields (path + updatedBy)
        await strapi.db
          .getConnection(fileTable)
          .transacting(trx.get())
          .whereIn('id', fileIds)
          .update(folderPathColName, destinationFolderPath);
      }

      await trx.commit();
    } catch (e) {
      await trx.rollback();
      throw e;
    }

    const updatedFolders = await strapi.db.query(FOLDER_MODEL_UID).findMany({
      where: { id: { $in: folderIds } },
    });

    const updatedFiles = await strapi.db.query(FILE_MODEL_UID).findMany({
      where: { id: { $in: fileIds } },
    });

    await getService('metrics').trackUsage('didBulkMoveMediaLibraryElements', {
      eventProperties: {
        rootFolderNumber: updatedFolders.length,
        rootAssetNumber: updatedFiles.length,
        totalFolderNumber,
        totalAssetNumber: totalFileNumber + updatedFiles.length,
      },
    });

    ctx.body = {
      data: {
        files: await pmFile.sanitizeOutput(updatedFiles),
        folders: await pmFolder.sanitizeOutput(updatedFolders),
      },
    };
  },
};
