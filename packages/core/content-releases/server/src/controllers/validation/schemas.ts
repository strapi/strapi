import * as yup from 'yup';

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
  })
  .required()
  .noUnknown();

export const SETTINGS_SCHEMA = yup
  .object()
  .shape({
    defaultTimezone: yup.string().nullable().default(null),
  })
  .required()
  .noUnknown();
