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

const validateUploadBody = (data = {}, isMulti = false) => {
  const schema = isMulti ? multiUploadSchema : uploadSchema;

  return validateYupSchema(schema, { strict: false })(data);
};

export { validateUploadBody };

export type UploadBody =
  | yup.InferType<typeof uploadSchema>
  | yup.InferType<typeof multiUploadSchema>;
