import { yup, validateYupSchema } from '@strapi/utils';

const settingsSchema = yup.object({
  aiLocalizations: yup.boolean().default(false),
}) as any;

export default validateYupSchema(settingsSchema);

export type Settings = { aiLocalizations?: boolean };
