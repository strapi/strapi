'use strict';

const { getService } = require('../utils');
const { ACTIONS, FOLDER_MODEL_UID, FILE_MODEL_UID } = require('../constants');
const {
  validateDeleteManyFoldersFiles,
  validateMoveManyFoldersFiles,
} = require('./validation/admin/folder-file');

module.exports = {
  async deleteMany(ctx) {
    const { body } = ctx.request;
    const {
      state: { userAbility },
    } = ctx;

    const pmFolder = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    const pmFile = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.read,
      model: FILE_MODEL_UID,
    });

    await validateDeleteManyFoldersFiles(body);

    const fileService = getService('file');
    const folderService = getService('folder');

    const deletedFiles = await fileService.deleteByIds(body.fileIds);
    const deletedFolders = await folderService.deleteByIds(body.folderIds);

    ctx.body = {
      data: {
        files: await pmFile.sanitizeOutput(deletedFiles),
        folders: await pmFolder.sanitizeOutput(deletedFolders),
      },
    };
  },
  async moveMany(ctx) {
    const { body } = ctx.request;
    const {
      state: { userAbility, user },
    } = ctx;

    const pmFolder = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: FOLDER_MODEL_UID,
    });

    const pmFile = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.read,
      model: FILE_MODEL_UID,
    });

    await validateMoveManyFoldersFiles(body);
    const { folderIds = [], fileIds = [], destinationFolderId } = body;

    const uploadService = getService('upload');
    const folderService = getService('folder');

    const updatedFolders = [];
    // updates are done in order (not in parallele) to avoid mixing queries (path)
    for (let folderId of folderIds) {
      const updatedFolder = await folderService.update(
        folderId,
        { parent: destinationFolderId },
        { user }
      );
      updatedFolders.push(updatedFolder);
    }

    const updatedFiles = await Promise.all(
      fileIds.map(fileId =>
        uploadService.updateFileInfo(fileId, { folder: destinationFolderId }, { user })
      )
    );

    ctx.body = {
      data: {
        files: await pmFile.sanitizeOutput(updatedFiles),
        folders: await pmFolder.sanitizeOutput(updatedFolders),
      },
    };
  },
};
