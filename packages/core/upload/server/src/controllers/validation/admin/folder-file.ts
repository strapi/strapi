import { intersection, map, isEmpty } from 'lodash/fp';
import { yup, validateYupSchema } from '@strapi/utils';
import { FOLDER_MODEL_UID } from '../../../constants';
import { folderExists } from './utils';
import { isFolderOrChild } from '../../utils/folders';

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

    const folders = await strapi.db.query(FOLDER_MODEL_UID).findMany({
      select: ['name'],
      where: { id: { $in: folderIds } },
    });

    const existingFolders = await strapi.db.query(FOLDER_MODEL_UID).findMany({
      select: ['name'],
      where: { parent: { id: destinationFolderId } },
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

      const destinationFolder = await strapi.db.query(FOLDER_MODEL_UID).findOne({
        select: ['path'],
        where: { id: destinationFolderId },
      });

      const folders = await strapi.db.query(FOLDER_MODEL_UID).findMany({
        select: ['name', 'path'],
        where: { id: { $in: folderIds } },
      });

      const unmovableFoldersNames = folders
        .filter((folder) => isFolderOrChild(destinationFolder, folder))
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

export const validateDeleteManyFoldersFiles = validateYupSchema(
  validateDeleteManyFoldersFilesSchema
);

export async function validateMoveManyFoldersFiles(body: unknown) {
  await validateYupSchema(validateStructureMoveManyFoldersFilesSchema)(body);
  await validateYupSchema(validateDuplicatesMoveManyFoldersFilesSchema)(body);
  await validateYupSchema(validateMoveFoldersNotInsideThemselvesSchema)(body);
}
