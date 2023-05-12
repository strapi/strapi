'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const stageObject = yup.object().shape({
  id: yup.number().integer().min(1),
  name: yup.string().max(255).required(),
  color: yup.string().matches(/^#(?:[0-9a-fA-F]{3}){1,2}$/i), // hex color
});

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
    .max(200, 'Can not have more than 200 stages')
    .required(),
});

const validateWorkflowUpdateSchema = yup.object().shape({
  name: yup.string().max(255),
  stages: yup
    .array()
    .of(stageObject)
    .min(1, 'Can not create a workflow without stages')
    .max(200, 'Can not have more than 200 stages'),
});

module.exports = {
  validateWorkflowCreate: validateYupSchema(validateWorkflowCreateSchema),
  validateUpdateStageOnEntity: validateYupSchema(validateUpdateStageOnEntity),
  validateWorkflowUpdate: validateYupSchema(validateWorkflowUpdateSchema),
};
