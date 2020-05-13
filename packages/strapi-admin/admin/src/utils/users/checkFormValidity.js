import { getYupInnerErrors } from 'strapi-helper-plugin';
import schema from './schema';

const checkFormValidity = async data => {
  let errors = null;

  try {
    await schema.validate(data, { abortEarly: false });
  } catch (err) {
    errors = getYupInnerErrors(err);
  }

  return errors;
};

export default checkFormValidity;
