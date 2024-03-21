import * as yup from 'yup';
import { validateYupSchema } from '@strapi/utils';

const renewToken = yup.object().shape({ token: yup.string().required() }).required().noUnknown();

export default validateYupSchema(renewToken);
