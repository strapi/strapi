import * as yup from 'yup';

export const REDUX_NAMESPACE = 'settings_review-workflows';

export const ACTION_SET_WORKFLOWS = `Settings/Review_Workflows/SET_WORKFLOWS`;
export const ACTION_DELETE_STAGE = `Settings/Review_Workflows/WORKFLOW_DELETE_STAGE`;
export const ACTION_ADD_STAGE = `Settings/Review_Workflows/WORKFLOW_ADD_STAGE`;
export const ACTION_UPDATE_STAGE = `Settings/Review_Workflows/WORKFLOW_UPDATE_STAGE`;

export const stagesSchema = yup.object({
  stages: yup.array().of(
    yup.object().shape({
      name: yup.string().required('Name is required'),
    })
  ),
});
