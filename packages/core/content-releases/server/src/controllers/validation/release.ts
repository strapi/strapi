import { yup, validateYupSchema } from '@strapi/utils';

import { RELEASE_CONDITIONS } from '../../../../shared/constants';

const RELEASE_FIELDS = {
  name: yup.string().trim().required(),
  scheduledAt: yup.string().nullable(),
  timezone: yup.string().when('scheduledAt', {
    is: (value: any) => value !== null && value !== undefined,
    then: yup.string().required(),
    otherwise: yup.string().nullable(),
  }),
  releaseCondition: yup.string().oneOf([...RELEASE_CONDITIONS]),
};

export const RELEASE_SCHEMA = yup.object().shape(RELEASE_FIELDS).required().noUnknown();

const CREATE_FROM_SKIPPED_ENTRIES_SCHEMA = yup
  .object()
  .shape({
    ...RELEASE_FIELDS,
    // Ids are bound as is: Postgres rejects anything that isn't an int32
    actionIds: yup
      .array()
      .of(
        yup
          .number()
          .integer()
          .min(1)
          .max(2 ** 31 - 1)
          .required()
      )
      .min(1),
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

export const validateCreateFromSkippedEntries = validateYupSchema(
  CREATE_FROM_SKIPPED_ENTRIES_SCHEMA
);

export const validatefindByDocumentAttachedParams = validateYupSchema(
  FIND_BY_DOCUMENT_ATTACHED_PARAMS_SCHEMA
);
