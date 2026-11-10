import { validateYupSchema, yup } from '@strapi/utils';

import { isPlain } from '../utils/is-plain';

const isText = (value: unknown) => typeof value === 'string' && value !== '';

/**
 * A preview's body. The checks run in the order the messages are listed in, and the first one that
 * fails is the answer: a test per field would run in the order yup sorts its fields, not this one.
 */
const conditionPreviewSchema = yup
  .mixed()
  .nullable()
  .test(
    'is-object',
    'A preview is an object: { condition, subject, userDocumentId, inputs }',
    (value) => isPlain(value)
  )
  .test(
    'subject',
    'subject is the uid of a content type',
    (value) => !isPlain(value) || isText(value.subject)
  )
  .test(
    'user-document-id',
    'userDocumentId is the documentId of an end user',
    (value) => !isPlain(value) || isText(value.userDocumentId)
  )
  .test(
    'inputs',
    'inputs is an object: the value of each input',
    (value) => !isPlain(value) || value.inputs === undefined || isPlain(value.inputs)
  );

export const validateConditionPreview = validateYupSchema(conditionPreviewSchema, {
  abortEarly: true,
});
