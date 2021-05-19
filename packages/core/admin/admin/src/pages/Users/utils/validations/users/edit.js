import * as yup from 'yup';
import profileValidation from './profile';
import rolesValidation from './roles';

const schema = yup.object().shape({
  ...profileValidation,
  isActive: yup.bool(),
  ...rolesValidation,
});

export default schema;
