/* eslint-disable func-names */
import { yup, validateYupSchema } from '@strapi/utils';
import { hasStageAttribute } from '../utils/review-workflows';
import { STAGE_TRANSITION_UID } from '../constants/workflows';

const stageObject = yup.object().shape({
  id: yup.number().integer().min(1),
  name: yup.string().max(255).required(),
  color: yup.string().matches(/^#(?:[0-9a-fA-F]{3}){1,2}$/i), // hex color
  permissions: yup.array().of(
    yup.object().shape({
      role: yup.number().integer().min(1).required(),
      action: yup.string().oneOf([STAGE_TRANSITION_UID]).required(),
      actionParameters: yup.object().shape({
        from: yup.number().integer().min(1).required(),
        to: yup.number().integer().min(1),
      }),
    })
  ),
});

const validateUpdateStageOnEntitySchema = yup
  .object()
  .shape({
    id: yup.number().integer().min(1).required(),
  })
  .required();

const validateContentTypes = yup.array().of(
  yup
    .string()
    .test({
      name: 'content-type-exists',
      message: (value) => `Content type ${value.originalValue} does not exist`,
      test(uid: any) {
        // Warning; we use the strapi global - to avoid that, it would need to refactor how
        // we generate validation function by using a factory with the strapi instance as parameter.
        return !!strapi.getModel(uid);
      },
    })
    .test({
      name: 'content-type-review-workflow-enabled',
      message: (value) =>
        `Content type ${value.originalValue} does not have review workflow enabled`,
      test(uid: any) {
        const model = strapi.getModel(uid);

        // It's not a valid content type if it doesn't have the stage attribute
        return hasStageAttribute(model);
      },
    })
);

const validateWorkflowCreateSchema = yup.object().shape({
  name: yup.string().max(255).min(1, 'Workflow name can not be empty').required(),
  stages: yup
    .array()
    .of(stageObject)
    // @ts-expect-error - add unique property into the yup namespace typing
    .uniqueProperty('name', 'Stage name must be unique')
    .min(1, 'Can not create a workflow without stages')
    .max(200, 'Can not have more than 200 stages')
    .required('Can not create a workflow without stages'),
  contentTypes: validateContentTypes,
  stageRequiredToPublishName: yup.string().min(1).nullable(),
});

const validateWorkflowUpdateSchema = yup.object().shape({
  name: yup.string().max(255).min(1, 'Workflow name can not be empty'),
  stages: yup
    .array()
    .of(stageObject)
    // @ts-expect-error - add unique property into the yup namespace typing
    .uniqueProperty('name', 'Stage name must be unique')
    .min(1, 'Can not update a workflow without stages')
    .max(200, 'Can not have more than 200 stages'),
  contentTypes: validateContentTypes,
  stageRequiredToPublishName: yup.string().min(1).nullable(),
});

const validateUpdateAssigneeOnEntitySchema = yup
  .object()
  .shape({
    id: yup.number().integer().min(1).nullable(),
  })
  .required();

const validateLocaleSchema = yup.string().nullable();

export const validateWorkflowCreate = validateYupSchema(validateWorkflowCreateSchema);
export const validateUpdateStageOnEntity = validateYupSchema(validateUpdateStageOnEntitySchema);
export const validateUpdateAssigneeOnEntity = validateYupSchema(
  validateUpdateAssigneeOnEntitySchema
);
export const validateWorkflowUpdate = validateYupSchema(validateWorkflowUpdateSchema);
export const validateLocale = validateYupSchema(validateLocaleSchema);

export default {
  validateWorkflowCreate,
  validateUpdateStageOnEntity,
  validateUpdateAssigneeOnEntity,
  validateWorkflowUpdate,
  validateLocale,
};
