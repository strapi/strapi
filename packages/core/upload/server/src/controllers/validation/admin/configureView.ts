import { yup, validateYupSchema } from '@strapi/utils';
import { ALLOWED_SORT_STRINGS } from '../../../constants';

const configSchema = yup.object({
  pageSize: yup.number().required(),
  sort: yup.mixed().oneOf(ALLOWED_SORT_STRINGS),
});

export const validateViewConfiguration = validateYupSchema(configSchema);

export type ViewConfiguration = yup.InferType<typeof configSchema>;
