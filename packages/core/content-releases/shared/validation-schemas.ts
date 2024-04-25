import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

export const RELEASE_SCHEMA = yup
  .object()
  .shape({
    name: yup.string().trim().required(translatedErrors.required),
    scheduledAt: yup.string().nullable(),
    isScheduled: yup.boolean().optional(),
    time: yup.string().when('isScheduled', {
      is: true,
      then: yup.string().trim().required(translatedErrors.required),
      otherwise: yup.string().nullable(),
    }),
    timezone: yup.string().when('isScheduled', {
      is: true,
      then: yup.string().required(translatedErrors.required).nullable(),
      otherwise: yup.string().nullable(),
    }),
    date: yup.string().when('isScheduled', {
      is: true,
      then: yup.string().required(translatedErrors.required).nullable(),
      otherwise: yup.string().nullable(),
    }),
  })
  .required()
  .noUnknown();
