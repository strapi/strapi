import { validateYupSchema, yup } from '@strapi/utils';

import { isPlain } from '../utils/is-plain';

const isText = (value: unknown) => typeof value === 'string' && value !== '';

/**
 * A preview's body. The checks run in the order the messages are listed in, and the first one that
 * fails is the answer: a test per field on an object schema would run in the order yup sorts its fields, not this one.
 */
const conditionPreviewSchema = yup
  .mixed()
  .nullable()
  .test(
    'is-object',
    'A preview is an object: { condition, subject, userDocumentId, inputs }',
    (value) => isPlain(value)
  )
  .test('subject', 'subject is the uid of a content type', function subject(value) {
    return !isPlain(value) || isText(value.subject) || this.createError({ path: 'subject' });
  })
  .test(
    'user-document-id',
    'userDocumentId is the documentId of an end user',
    function userDocumentId(value) {
      return (
        !isPlain(value) ||
        isText(value.userDocumentId) ||
        this.createError({ path: 'userDocumentId' })
      );
    }
  )
  .test('inputs', 'inputs is an object: the value of each input', function inputs(value) {
    return (
      !isPlain(value) ||
      value.inputs === undefined ||
      isPlain(value.inputs) ||
      this.createError({ path: 'inputs' })
    );
  });

export const validateConditionPreview = validateYupSchema(conditionPreviewSchema, {
  abortEarly: true,
});
