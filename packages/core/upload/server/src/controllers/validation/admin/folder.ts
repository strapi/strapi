import { isUndefined, get, isNil } from 'lodash/fp';
import { yup, validateYupSchema } from '@strapi/utils';
import { getService } from '../../../utils';
import { FOLDER_MODEL_UID } from '../../../constants';
import { folderExists } from './utils';
import { isFolderOrChild } from '../../utils/folders';

const NO_SLASH_REGEX = /^[^/]+$/;
const NO_SPACES_AROUND = /^(?! ).+(?<! )$/;

const isNameUniqueInFolder = (id?: number): yup.TestFunction<string | undefined> => {
  return async function test(name?: string) {
    const { exists } = getService('folder');
    const filters: Record<string, unknown> = { name, parent: this.parent.parent || null };
    if (id) {
      filters.id = { $ne: id };

      if (isUndefined(name)) {
        const existingFolder = await strapi.db.query(FOLDER_MODEL_UID).findOne({ where: { id } });
        filters.name = get('name', existingFolder);
      }
    }

    const doesExist = await exists(filters);
    return !doesExist;
  };
};

const validateCreateFolderSchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .min(1)
      .matches(NO_SLASH_REGEX, 'name cannot contain slashes')
      .matches(NO_SPACES_AROUND, 'name cannot start or end with a whitespace')
      .required()
      .test('is-folder-unique', 'A folder with this name already exists', isNameUniqueInFolder()),
    parent: yup
      .strapiID()
      .nullable()
      .test('folder-exists', 'parent folder does not exist', folderExists),
  })
  .noUnknown()
  .required();

const validateUpdateFolderSchema = (id: number) =>
  yup
    .object()
    .shape({
      name: yup
        .string()
        .min(1)
        .matches(NO_SLASH_REGEX, 'name cannot contain slashes')
        .matches(NO_SPACES_AROUND, 'name cannot start or end with a whitespace')
        .test(
          'is-folder-unique',
          'A folder with this name already exists',
          isNameUniqueInFolder(id)
        ),
      parent: yup
        .strapiID()
        .nullable()
        .test('folder-exists', 'parent folder does not exist', folderExists)
        .test(
          'dont-move-inside-self',
          'folder cannot be moved inside itself',
          async function test(parent) {
            if (isNil(parent)) return true;

            const destinationFolder = await strapi.db.query(FOLDER_MODEL_UID).findOne({
              select: ['path'],
              where: { id: parent },
            });

            const currentFolder = await strapi.db.query(FOLDER_MODEL_UID).findOne({
              select: ['path'],
              where: { id },
            });

            if (!destinationFolder || !currentFolder) return true;

            return !isFolderOrChild(destinationFolder, currentFolder);
          }
        ),
    })
    .noUnknown()
    .required();

export const validateCreateFolder = validateYupSchema(validateCreateFolderSchema);
export const validateUpdateFolder = (id: number) =>
  validateYupSchema(validateUpdateFolderSchema(id));
