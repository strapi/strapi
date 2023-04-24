'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const stageObject = yup.object().shape({
  id: yup.number().integer().min(1),
  name: yup.string().max(255).required(),
});

const validateUpdateStagesSchema = yup
  .array()
  .of(stageObject)
  .required()
  .max(200, 'You can not create more than 200 stages');

const validateUpdateStageOnEntity = yup
  .object()
  .shape({
    id: yup.number().integer().min(1).required(),
  })
  .required();

module.exports = {
  validateUpdateStages: validateYupSchema(validateUpdateStagesSchema, {
    strict: false,
    stripUnknown: true,
  }),
  validateUpdateStageOnEntity: validateYupSchema(validateUpdateStageOnEntity),
};
