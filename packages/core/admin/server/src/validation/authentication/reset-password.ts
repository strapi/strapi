import { yup, validateYupSchema } from '@strapi/utils';
import validators from '../common-validators';

const resetPasswordSchema = yup
  .object()
  .shape({
    resetPasswordToken: yup.string().required(),
    password: validators.password.required(),
  })
  .required()
  .noUnknown();

export default validateYupSchema(resetPasswordSchema);
