import * as yup from 'yup';

export const RELEASE_SCHEMA = yup
  .object()
  .shape({
    name: yup.string().trim().required(),
    scheduledAt: yup.string().nullable(),
    isScheduled: yup.boolean().optional(),
    time: yup.string().when('isScheduled', {
      is: true,
      then: yup.string().trim().required(),
      otherwise: yup.string().nullable(),
    }),
    timezone: yup.string().when('isScheduled', {
      is: true,
      then: yup.string().required().nullable(),
      otherwise: yup.string().nullable(),
    }),
    date: yup.string().when('isScheduled', {
      is: true,
      then: yup.string().required().nullable(),
      otherwise: yup.string().nullable(),
    }),
  })
  .required()
  .noUnknown();
