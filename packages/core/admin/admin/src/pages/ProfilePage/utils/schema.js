import * as yup from 'yup';

import { profileValidation } from '../../SettingsPage/pages/Users/utils/validations/users';

const schema = yup.object().shape(profileValidation);

export default schema;
