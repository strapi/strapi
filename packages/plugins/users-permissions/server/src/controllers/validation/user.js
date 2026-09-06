'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const deleteRoleSchema = yup.object().shape({
  role: yup.strapiID().required(),
});

// A role relation entry may be referenced by numeric `id` (legacy) or by
// `documentId` (the v5 default), but must carry at least one of them.
const roleRelationEntrySchema = yup
  .object()
  .shape({ id: yup.strapiID(), documentId: yup.strapiID() })
  .test(
    'id-or-documentId',
    'Relation entry must include an id or documentId',
    (entry) => !!entry && (entry.id != null || entry.documentId != null)
  );

const createUserBodySchema = yup.object().shape({
  email: yup.string().email().required(),
  username: yup.string().min(1).required(),
  password: yup.string().min(1).required(),
  role: yup.lazy((value) =>
    typeof value === 'object'
      ? yup
          .object()
          .shape({
            connect: yup
              .array()
              .of(roleRelationEntrySchema)
              .min(1, 'Users must have a role')
              .required(),
          })
          .required()
      : yup.strapiID().required()
  ),
});

const updateUserBodySchema = yup.object().shape({
  email: yup.string().email().min(1),
  username: yup.string().min(1),
  password: yup
    .mixed()
    .test(
      'password-validation',
      'Password must be at least 1 character',
      function validatePassword(value) {
        if (value == null || value === '') {
          return true;
        }
        return typeof value === 'string' && value.length >= 1;
      }
    ),
  role: yup.lazy((value) =>
    typeof value === 'object'
      ? yup.object().shape({
          // connect/disconnect are each optional (matching core relation inputs),
          // but a role must remain: reject disconnecting every role without
          // connecting a replacement.
          connect: yup.array().of(roleRelationEntrySchema),
          disconnect: yup
            .array()
            .of(roleRelationEntrySchema)
            .test('CheckDisconnect', 'Cannot remove role', function test(disconnect) {
              const connectValue = value.connect || [];
              const disconnectValue = disconnect || [];
              if (connectValue.length === 0 && disconnectValue.length > 0) {
                return false;
              }

              return true;
            }),
        })
      : yup.strapiID()
  ),
});

module.exports = {
  validateCreateUserBody: validateYupSchema(createUserBodySchema),
  validateUpdateUserBody: validateYupSchema(updateUserBodySchema),
  validateDeleteRoleBody: validateYupSchema(deleteRoleSchema),
};
