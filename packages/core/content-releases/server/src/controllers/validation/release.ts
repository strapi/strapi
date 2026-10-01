import { yup, validateYupSchema } from '@strapi/utils';

import { RELEASE_PUBLISH_MODES } from '../../constants';

export const RELEASE_SCHEMA = yup
  .object()
  .shape({
    name: yup.string().trim().required(),
    scheduledAt: yup.string().nullable(),
    timezone: yup.string().when('scheduledAt', {
      is: (value: any) => value !== null && value !== undefined,
      then: yup.string().required(),
      otherwise: yup.string().nullable(),
    }),
    publishMode: yup.string().oneOf([...RELEASE_PUBLISH_MODES]),
  })
  .required()
  .noUnknown();

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
