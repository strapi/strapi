import * as yup from 'yup';

export const RELEASE_SCHEMA = yup
  .object()
  .shape({
    name: yup.string().trim().required(),
    scheduledAt: yup.string().nullable(),
    timezone: yup.string().when('scheduledAt', {
      is: (scheduledAt: string) => !!scheduledAt,
      then: yup.string().required(),
      otherwise: yup.string().nullable(),
    }),
  })
  .required();
