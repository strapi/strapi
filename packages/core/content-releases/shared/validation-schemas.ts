import * as yup from 'yup';

export const RELEASE_SCHEMA = yup
  .object()
  .shape({
    name: yup.string().trim().required(),
  })
  .required()
  .noUnknown();
