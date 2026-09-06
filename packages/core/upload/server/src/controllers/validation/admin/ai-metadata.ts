import { yup, validateYupSchema } from '@strapi/utils';

import { AI_METADATA_MAX_FILES } from '../../../constants';

const validateGenerateAIMetadataSchema = yup
  .object()
  .shape({
    fileIds: yup
      .array()
      .of(yup.strapiID().required())
      .min(1)
      .max(
        AI_METADATA_MAX_FILES,
        `You can generate metadata for up to ${AI_METADATA_MAX_FILES} assets at a time. Select fewer assets and try again.`
      )
      .required(),
  })
  .noUnknown()
  .required();

export const validateGenerateAIMetadataBody = validateYupSchema(validateGenerateAIMetadataSchema);
