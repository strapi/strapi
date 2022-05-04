'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');
const { isNil } = require('lodash/fp');
const { getService } = require('../../../utils');

const NO_SLASH_REGEX = /^[^/]+$/;
const NO_SPACES_AROUND = /^(?! ).+(?<! )$/;

const validateCreateFolderSchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .min(1)
      .matches(NO_SLASH_REGEX, 'name cannot contain slashes')
      .matches(NO_SPACES_AROUND, 'name cannot start or end with a whitespace')
      .required(),
    parent: yup
      .strapiID()
      .nullable()
      .test('folder-exists', 'parent folder does not exist', async folderId => {
        if (isNil(folderId)) {
          return true;
        }

        const exists = await getService('folder').exists({ id: folderId });

        return exists;
      }),
  })
  .noUnknown()
  .required()
  .test('is-folder-unique', 'name already taken', async folder => {
    const { exists } = getService('folder');
    const doesExist = await exists({ parent: folder.parent || null, name: folder.name });
    return !doesExist;
  });

module.exports = {
  validateCreateFolder: validateYupSchema(validateCreateFolderSchema),
};
