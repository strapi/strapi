'use strict';

const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;

const validateSchema = schema => async (body, errorMessage) => {
  try {
    await schema.validate(body, { strict: true, abortEarly: false });
  } catch (e) {
    throw new YupValidationError(e, errorMessage);
  }
};

const deleteRoleSchema = yup.object().shape({
  role: yup.strapiID().required(),
});

const createUserBodySchema = yup
  .object()
  .shape({
    email: yup
      .string()
      .email()
      .required(),
    username: yup
      .string()
      .min(1)
      .required(),
    password: yup
      .string()
      .min(1)
      .required(),
    role: yup.strapiID(),
  })
  .noUnknown();

const updateUserBodySchema = yup.object().shape({
  email: yup
    .string()
    .email()
    .min(1),
  username: yup.string().min(1),
  password: yup.string().min(1),
});

module.exports = {
  validateCreateUserBody: validateSchema(createUserBodySchema),
  validateUpdateUserBody: validateSchema(updateUserBodySchema),
  validateDeleteRoleBody: validateSchema(deleteRoleSchema),
};
