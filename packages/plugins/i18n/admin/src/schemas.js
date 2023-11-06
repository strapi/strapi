import { translatedErrors as errorsTrads } from '@strapi/helper-plugin';
import { object, string } from 'yup';

const localeFormSchema = object().shape({
  code: string().required(),
  displayName: string()
    .max(50, 'Settings.locales.modal.locales.displayName.error')
    .required(errorsTrads.required),
});

export default localeFormSchema;
