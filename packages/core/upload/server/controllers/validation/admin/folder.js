'use strict';

const { isUndefined, get, isNil } = require('lodash/fp');
const { yup, validateYupSchema } = require('@strapi/utils');
const { getService } = require('../../../utils');
const { FOLDER_MODEL_UID } = require('../../../constants');
const { folderExists } = require('./utils');

const NO_SLASH_REGEX = /^[^/]+$/;
const NO_SPACES_AROUND = /^(?! ).+(?<! )$/;

const isNameUniqueInFolder = (id) =>
  async function (name) {
    const { exists } = getService('folder');
    const filters = { name, parent: this.parent.parent || null };
    if (id) {
      filters.id = { $ne: id };

      if (isUndefined(name)) {
        const existingFolder = await strapi.entityService.findOne(FOLDER_MODEL_UID, id);
        filters.name = get('name', existingFolder);
      }
    }

    const doesExist = await exists(filters);
    return !doesExist;
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

const validateUpdateFolderSchema = (id) =>
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
          async function (parent) {
            if (isNil(parent)) return true;

            const destinationFolder = await strapi.entityService.findOne(FOLDER_MODEL_UID, parent, {
              fields: ['path'],
            });

            const currentFolder = await strapi.entityService.findOne(FOLDER_MODEL_UID, id, {
              fields: ['path'],
            });

            if (!destinationFolder || !currentFolder) return true;

            return !destinationFolder.path.startsWith(currentFolder.path);
          }
        ),
    })
    .noUnknown()
    .required();

module.exports = {
  validateCreateFolder: validateYupSchema(validateCreateFolderSchema),
  validateUpdateFolder: (id) => validateYupSchema(validateUpdateFolderSchema(id)),
};
