'use strict';

const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;

const callbackBodySchema = yup.object().shape({
  identifier: yup.string().required(),
  password: yup.string().required(),
});

const registerBodySchema = yup.object().shape({
  email: yup
    .string()
    .email()
    .required(),
  password: yup.string().required(),
});

const sendEmailConfirmationBodySchema = yup.object().shape({
  email: yup
    .string()
    .email()
    .required(),
});

const validateSchema = schema => async (body, errorMessage) => {
  try {
    await schema.validate(body, { strict: true, abortEarly: false });
  } catch (e) {
    throw new YupValidationError(e, errorMessage);
  }
};

module.exports = {
  validateCallbackBody: validateSchema(callbackBodySchema),
  validateRegisterBody: validateSchema(registerBodySchema),
  validateSendEmailConfirmationBody: validateSchema(sendEmailConfirmationBodySchema),
};
