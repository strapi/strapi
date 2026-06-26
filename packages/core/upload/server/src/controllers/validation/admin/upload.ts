import { yup, validateYupSchema } from '@strapi/utils';
import { isNil } from 'lodash/fp';
import { getService } from '../../../utils';

const focalPointSchema = yup
  .object({
    x: yup.number().min(0).max(100).required(),
    y: yup.number().min(0).max(100).required(),
  })
  .nullable()
  .default(null);

const fileInfoSchema = yup.object({
  name: yup.string().nullable(),
  alternativeText: yup.string().nullable(),
  caption: yup.string().nullable(),
  focalPoint: focalPointSchema,
  folder: yup
    .strapiID()
    .nullable()
    .test('folder-exists', 'the folder does not exist', async (folderId) => {
      if (isNil(folderId)) {
        return true;
      }

      const exists = await getService('folder').exists({ id: folderId });

      return exists;
    }),
});

const uploadSchema = yup.object({
  fileInfo: fileInfoSchema,
});

const multiUploadSchema = yup.object({
  fileInfo: yup.array().of(fileInfoSchema),
});

const validateUploadBody = (data = {}, isMulti = false) => {
  const schema = isMulti ? multiUploadSchema : uploadSchema;

  return validateYupSchema(schema, { strict: false })(data);
};

export { validateUploadBody };

export type UploadBody =
  | yup.InferType<typeof uploadSchema>
  | yup.InferType<typeof multiUploadSchema>;

const bulkUpdatesSchema = yup.object({
  updates: yup
    .array()
    .of(
      yup.object({
        id: yup.number().required(),
        fileInfo: fileInfoSchema.required(),
      })
    )
    .min(1)
    .required(),
});

export const validateBulkUpdateBody = validateYupSchema(bulkUpdatesSchema);
