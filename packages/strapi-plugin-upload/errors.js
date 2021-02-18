'use strict';

const errorTypes = {
  ENTITY_TOO_LARGE: 'entityTooLarge',
  UNKNOWN_ERROR: 'unknownError',
};

const entityTooLarge = message => {
  const error = new Error(message || 'Entity too large');
  error.type = errorTypes.ENTITY_TOO_LARGE;
  return error;
};
entityTooLarge.type = errorTypes.ENTITY_TOO_LARGE;

const unknownError = message => {
  const error = new Error(message || 'Unknown error');
  error.type = errorTypes.UNKNOWN_ERROR;
  return error;
};
unknownError.type = errorTypes.UNKNOWN_ERROR;

const is = (err, errorFactory) => {
  return err.type && err.type === errorFactory.type;
};

const convertToStrapiError = err => {
  if (is(err, entityTooLarge)) {
    return strapi.errors.entityTooLarge('FileTooBig', {
      errors: [
        {
          id: 'Upload.status.sizeLimit',
          message: 'file is bigger than the limit size!',
        },
      ],
    });
  } else {
    strapi.log.error(err);
    return strapi.errors.badImplementation();
  }
};

module.exports = {
  errors: {
    entityTooLarge,
    unknownError,
  },
  convertToStrapiError,
};
