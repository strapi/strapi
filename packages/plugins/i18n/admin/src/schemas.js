import { object, string } from 'yup';
import { translatedErrors as errorsTrads } from '@strapi/helper-plugin';

const localeFormSchema = object().shape({
  code: string().required(),
  displayName: string()
    .max(50, 'Settings.locales.modal.locales.displayName.error')
    .required(errorsTrads.required),
});

export default localeFormSchema;
