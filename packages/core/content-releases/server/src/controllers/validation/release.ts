import { yup, validateYupSchema } from '@strapi/utils';
import { RELEASE_SCHEMA } from '../validation/schemas';

const FIND_BY_DOCUMENT_ATTACHED_PARAMS_SCHEMA = yup
  .object()
  .shape({
    contentType: yup.string().required(),
    entryDocumentId: yup.string().nullable(),
    hasEntryAttached: yup.string().nullable(),
    locale: yup.string().nullable(),
  })
  .required()
  .noUnknown();

export const validateRelease = validateYupSchema(RELEASE_SCHEMA);

export const validatefindByDocumentAttachedParams = validateYupSchema(
  FIND_BY_DOCUMENT_ATTACHED_PARAMS_SCHEMA
);
