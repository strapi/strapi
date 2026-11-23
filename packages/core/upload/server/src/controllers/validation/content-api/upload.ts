import { yup, validateYupSchema } from '@strapi/utils';

const focalPointSchema = yup
  .object({
    x: yup.number().min(0).max(100).required(),
    y: yup.number().min(0).max(100).required(),
  })
  .nullable()
  .default(null);

const fileInfoSchema = yup
  .object({
    name: yup.string().nullable(),
    alternativeText: yup.string().nullable(),
    caption: yup.string().nullable(),
    focalPoint: focalPointSchema,
  })
  .noUnknown();

const uploadSchema = yup.object({
  fileInfo: fileInfoSchema,
});

const multiUploadSchema = yup.object({
  fileInfo: yup.array().of(fileInfoSchema),
});

/**
 * Target folder id for new uploads (POST /api/upload without ?id=).
 * Multipart fields arrive as strings, so the string "null" means the root folder.
 * Only used when creating files: replace and file info updates do not accept a folder.
 */

const folderErrorMessage = 'folder must be a folder id or null';
const uploadFolderSchema = yup
  .number()
  .transform((value, originalValue) => {
    if (originalValue === 'null') {
      return null;
    }

    // yup would cast a one-element array to its element
    return Array.isArray(originalValue) ? NaN : value;
  })
  .typeError(folderErrorMessage)
  .integer(folderErrorMessage)
  .positive(folderErrorMessage)
  .nullable();

const uploadFilesSchema = uploadSchema.shape({ folder: uploadFolderSchema });

const multiUploadFilesSchema = multiUploadSchema.shape({ folder: uploadFolderSchema });

const validateUploadBody = (data = {}, isMulti = false) => {
  const schema = isMulti ? multiUploadSchema : uploadSchema;

  return validateYupSchema(schema, { strict: false })(data);
};

const validateUploadFilesBody = (data = {}, isMulti = false) => {
  const schema = isMulti ? multiUploadFilesSchema : uploadFilesSchema;

  return validateYupSchema(schema, { strict: false })(data);
};

export { validateUploadBody, validateUploadFilesBody };

export type UploadBody =
  yup.InferType<typeof uploadSchema> | yup.InferType<typeof multiUploadSchema>;
