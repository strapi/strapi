// TODO change this util from the global one that will be added in the codebase
// with https://github.com/strapi/strapi/pull/6202

import { getYupInnerErrors } from 'strapi-helper-plugin';

const checkFormValidity = async (data, schema) => {
  let errors = null;

  try {
    await schema.validate(data, { abortEarly: false });
  } catch (err) {
    errors = getYupInnerErrors(err);
  }

  return errors;
};

export default checkFormValidity;
