import * as yup from 'yup';
import { profileValidation } from '../../../validations/users';

const schema = yup.object().shape(profileValidation);

export default schema;
