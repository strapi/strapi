import { validateYupSchema } from '@strapi/utils';
import { SETTINGS_SCHEMA } from '../validation/schemas';

export const validateSettings = validateYupSchema(SETTINGS_SCHEMA);
