'use strict';

const { intersection, map, isEmpty } = require('lodash/fp');
const { yup, validateYupSchema } = require('@strapi/utils');
const { FOLDER_MODEL_UID } = require('../../../constants');
const { folderExists } = require('./utils');

const validateDeleteManyFoldersFilesSchema = yup
  .object()
  .shape({
    fileIds: yup.array().of(yup.strapiID().required()),
    folderIds: yup.array().of(yup.strapiID().required()),
  })
  .noUnknown()
  .required();

const validateStructureMoveManyFoldersFilesSchema = yup
  .object()
  .shape({
    destinationFolderId: yup
      .strapiID()
      .nullable()
      .defined()
      .test('folder-exists', 'destination folder does not exist', folderExists),
    fileIds: yup.array().of(yup.strapiID().required()),
    folderIds: yup.array().of(yup.strapiID().required()),
  })
  .noUnknown()
  .required();

const validateDuplicatesMoveManyFoldersFilesSchema = yup
  .object()
  .test('are-folders-unique', 'some folders already exist', async function (value) {
    const { folderIds, destinationFolderId } = value;
    if (isEmpty(folderIds)) return true;

    const folders = await strapi.entityService.findMany(FOLDER_MODEL_UID, {
      fields: ['name'],
      filters: { id: { $in: folderIds } },
    });

    const existingFolders = await strapi.entityService.findMany(FOLDER_MODEL_UID, {
      fields: ['name'],
      filters: { parent: { id: destinationFolderId } },
    });
    const duplicatedNames = intersection(map('name', folders), map('name', existingFolders));
    if (duplicatedNames.length > 0) {
      return this.createError({
        message: `some folders already exists: ${duplicatedNames.join(', ')}`,
      });
    }

    return true;
  });

const validateMoveFoldersNotInsideThemselvesSchema = yup
  .object()
  .test(
    'dont-move-inside-self',
    'folders cannot be moved inside themselves or one of its children',
    async function (value) {
      const { folderIds, destinationFolderId } = value;
      if (destinationFolderId === null || isEmpty(folderIds)) return true;

      const destinationFolder = await strapi.entityService.findOne(
        FOLDER_MODEL_UID,
        destinationFolderId,
        {
          fields: ['path'],
        }
      );
      const folders = await strapi.entityService.findMany(FOLDER_MODEL_UID, {
        fields: ['name', 'path'],
        filters: { id: { $in: folderIds } },
      });

      const unmovableFoldersNames = folders
        .filter((folder) => destinationFolder.path.startsWith(folder.path))
        .map((f) => f.name);
      if (unmovableFoldersNames.length > 0) {
        return this.createError({
          message: `folders cannot be moved inside themselves or one of its children: ${unmovableFoldersNames.join(
            ', '
          )}`,
        });
      }

      return true;
    }
  );

module.exports = {
  validateDeleteManyFoldersFiles: validateYupSchema(validateDeleteManyFoldersFilesSchema),
  async validateMoveManyFoldersFiles(body) {
    await validateYupSchema(validateStructureMoveManyFoldersFilesSchema)(body);
    await validateYupSchema(validateDuplicatesMoveManyFoldersFilesSchema)(body);
    await validateYupSchema(validateMoveFoldersNotInsideThemselvesSchema)(body);
  },
};
