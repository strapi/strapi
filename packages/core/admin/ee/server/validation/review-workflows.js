'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const stageObject = yup.object().shape({
  id: yup.number().integer().min(1),
  name: yup.string().max(255).required(),
  color: yup.string().matches(/^#(?:[0-9a-fA-F]{3}){1,2}$/i), // hex color
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
