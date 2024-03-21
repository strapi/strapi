'use strict';

const yup = require('yup');
const { validators, validateYupSchema } = require('@strapi/utils');

const deleteRoleSchema = yup.object().shape({
  role: validators.strapiID().required(),
});

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
              .of(yup.object().shape({ id: validators.strapiID().required() }))
              .min(1, 'Users must have a role')
              .required(),
          })
          .required()
      : validators.strapiID().required()
  ),
});

const updateUserBodySchema = yup.object().shape({
  email: yup.string().email().min(1),
  username: yup.string().min(1),
  password: yup.string().min(1),
  role: yup.lazy((value) =>
    typeof value === 'object'
      ? yup.object().shape({
          connect: yup
            .array()
            .of(yup.object().shape({ id: validators.strapiID().required() }))
            .required(),
          disconnect: yup
            .array()
            .test('CheckDisconnect', 'Cannot remove role', function test(disconnectValue) {
              if (value.connect.length === 0 && disconnectValue.length > 0) {
                return false;
              }

              return true;
            })
            .required(),
        })
      : validators.strapiID()
  ),
});

module.exports = {
  validateCreateUserBody: validateYupSchema(createUserBodySchema),
  validateUpdateUserBody: validateYupSchema(updateUserBodySchema),
  validateDeleteRoleBody: validateYupSchema(deleteRoleSchema),
};
