import * as yup from 'yup';
import { commonUserSchema } from './profile';
import rolesValidation from './roles';

const schema = yup.object().shape({
  ...commonUserSchema,
  isActive: yup.bool(),
  ...rolesValidation,
});

export default schema;
