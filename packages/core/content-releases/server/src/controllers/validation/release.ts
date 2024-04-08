import { validateYupSchema } from '@strapi/utils';
import { RELEASE_SCHEMA, RELEASE_API_SCHEMA } from '../../../../shared/validation-schemas';

export const validateRelease = validateYupSchema(RELEASE_SCHEMA);
export const validateReleaseApi = validateYupSchema(RELEASE_API_SCHEMA);
