import * as yup from 'yup';

export function getWorkflowValidationSchema({ formatMessage }) {
  return yup.object({
    stages: yup.array().of(
      yup.object().shape({
        name: yup
          .string()
          .required(
            formatMessage({
              id: 'Settings.review-workflows.validation.stage.name',
              defaultMessage: 'Name is required',
            })
          )
          .max(
            255,
            formatMessage({
              id: 'Settings.review-workflows.validation.stage.max-length',
              defaultMessage: 'Name can not be longer than 255 characters',
            })
          ),
      })
    ),
  });
}
