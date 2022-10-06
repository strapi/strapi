'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const deleteRoleSchema = yup.object().shape({
  role: yup.strapiID().required(),
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
              .of(yup.object().shape({ id: yup.strapiID().required() }))
              .min(1)
              .required(),
          })
          .required()
      : yup.strapiID().required()
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
            .of(yup.object().shape({ id: yup.strapiID().required() }))
            .min(1)
            .required(),
        })
      : yup.strapiID()
  ),
});

module.exports = {
  validateCreateUserBody: validateYupSchema(createUserBodySchema),
  validateUpdateUserBody: validateYupSchema(updateUserBodySchema),
  validateDeleteRoleBody: validateYupSchema(deleteRoleSchema),
};
