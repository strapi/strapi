import * as yup from 'yup';
import { translatedErrors } from '@strapi/admin/strapi-admin';

export const RELEASE_SCHEMA = yup
  .object()
  .shape({
    name: yup.string().trim().required({
      id: translatedErrors.required.id,
      defaultMessage: 'This field is required',
    }),
    scheduledAt: yup.string().nullable(),
    isScheduled: yup.boolean().optional(),
    time: yup.string().when('isScheduled', {
      is: true,
      then: yup.string().trim().required({
        id: translatedErrors.required.id,
        defaultMessage: 'This field is required',
      }),
      otherwise: yup.string().nullable(),
    }),
    timezone: yup.string().when('isScheduled', {
      is: true,
      then: yup
        .string()
        .required({
          id: translatedErrors.required.id,
          defaultMessage: 'This field is required',
        })
        .nullable(),
      otherwise: yup.string().nullable(),
    }),
    date: yup.string().when('isScheduled', {
      is: true,
      then: yup
        .string()
        .required({
          id: translatedErrors.required.id,
          defaultMessage: 'This field is required',
        })
        .nullable(),
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
