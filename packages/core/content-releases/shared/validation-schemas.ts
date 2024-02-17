import * as yup from 'yup';

export const RELEASE_SCHEMA = yup
  .object()
  .shape({
    name: yup.string().trim().required(),
    // scheduledAt is a date, but we always receive strings from the client
    scheduledAt: yup.string().nullable(),
  })
  .required()
  .noUnknown();
