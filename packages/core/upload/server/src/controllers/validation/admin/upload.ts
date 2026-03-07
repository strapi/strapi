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

const validateUploadBodyImpl = (data = {}, isMulti = false) => {
  const schema = isMulti ? multiUploadSchema : uploadSchema;

  return validateYupSchema(schema as any, { strict: false })(data);
};

/** Portable type for upload body (no yup reference). */
export type FileInfoInput = {
  name?: string | null;
  alternativeText?: string | null;
  caption?: string | null;
  focalPoint?: { x: number; y: number } | null;
  folder?: string | number | null;
};

export type UploadBody = { fileInfo: FileInfoInput } | { fileInfo: FileInfoInput[] };

export type BulkUpdateBody = {
  updates: Array<{ id: number; fileInfo: FileInfoInput }>;
};

export const validateUploadBody = validateUploadBodyImpl as (
  data?: unknown,
  isMulti?: boolean
) => Promise<UploadBody>;

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

export const validateBulkUpdateBody = (
  body: unknown,
  errorMessage?: string
): Promise<BulkUpdateBody> =>
  validateYupSchema(bulkUpdatesSchema as any)(body, errorMessage) as Promise<BulkUpdateBody>;
