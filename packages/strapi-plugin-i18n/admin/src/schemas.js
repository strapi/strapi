import { object, string } from 'yup';

const localeFormSchema = object().shape({
  displayName: string().max(50, 'Settings.locales.modal.create.locales.displayName.error'),
});

export default localeFormSchema;
