'use strict';

const { getService } = require('../utils');
const { validateDeleteManyFoldersFiles } = require('./validation/admin/folder-file');

module.exports = {
  async deleteMany(ctx) {
    const { body } = ctx.request;

    await validateDeleteManyFoldersFiles(body);

    const fileService = getService('file');
    const folderService = getService('folder');

    const deletedFiles = await fileService.deleteByIds(body.fileIds);
    const deletedFolders = await folderService.deleteByIds(body.folderIds);

    ctx.body = {
      data: {
        files: deletedFiles,
        folders: deletedFolders,
      },
    };
  },
};
