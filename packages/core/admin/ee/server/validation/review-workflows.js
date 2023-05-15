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

const validateWorkflowCreateSchema = yup.object().shape({
  name: yup.string().max(255).required(),
  stages: yup
    .array()
    .of(stageObject)
    .min(1, 'Can not create a workflow without stages')
    .required('Can not create a workflow without stages'),
});

const validateWorkflowUpdateSchema = yup.object().shape({
  name: yup.string().max(255),
  stages: yup.array().of(stageObject),
});

module.exports = {
  validateWorkflowCreate: validateYupSchema(validateWorkflowCreateSchema),
  validateUpdateStages: validateYupSchema(validateUpdateStagesSchema, {
    strict: false,
    stripUnknown: true,
  }),
  validateUpdateStageOnEntity: validateYupSchema(validateUpdateStageOnEntity),
  validateWorkflowUpdate: validateYupSchema(validateWorkflowUpdateSchema),
};
