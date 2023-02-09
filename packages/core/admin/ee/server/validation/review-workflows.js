'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const stageObject = yup.object().shape({
  id: yup.number().integer().min(1),
  name: yup.string().max(255).required(),
});

const validateUpdateStagesSchema = yup.array().of(stageObject).required();

module.exports = {
  validateUpdateStages: validateYupSchema(validateUpdateStagesSchema, {
    strict: false,
    stripUnknown: true,
  }),
};
