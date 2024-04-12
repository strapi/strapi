import { validateYupSchema } from '@strapi/utils';
import { RELEASE_SCHEMA } from '../../../../shared/validation-schemas';

export const validateRelease = validateYupSchema(RELEASE_SCHEMA);
