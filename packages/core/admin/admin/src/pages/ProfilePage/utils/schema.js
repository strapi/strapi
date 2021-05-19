import * as yup from 'yup';
import { profileValidation } from '../../Users/utils/validations/users';

const schema = yup.object().shape(profileValidation);

export default schema;
