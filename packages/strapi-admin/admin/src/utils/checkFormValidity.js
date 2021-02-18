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
