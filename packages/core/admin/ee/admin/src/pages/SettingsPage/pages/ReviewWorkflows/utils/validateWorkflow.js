import set from 'lodash/set';
import * as yup from 'yup';

export async function validateWorkflow({ values, formatMessage }) {
  const schema = yup.object({
    contentTypes: yup.array().of(yup.string()),
    name: yup
      .string()
      .max(
        255,
        formatMessage({
          id: 'Settings.review-workflows.validation.name.max-length',
          defaultMessage: 'Name can not be longer than 255 characters',
        })
      )
      .required(),

    stages: yup
      .array()
      .of(
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
            )
            .test(
              'unique-name',
              formatMessage({
                id: 'Settings.review-workflows.validation.stage.duplicate',
                defaultMessage: 'Stage name must be unique',
              }),
              function (stageName) {
                const {
                  options: { context },
                } = this;

                return context.stages.filter((stage) => stage.name === stageName).length === 1;
              }
            ),
          color: yup
            .string()
            .required(
              formatMessage({
                id: 'Settings.review-workflows.validation.stage.color',
                defaultMessage: 'Color is required',
              })
            )
            .matches(/^#(?:[0-9a-fA-F]{3}){1,2}$/i),

          permissions: yup
            .array(
              yup.object({
                role: yup
                  .number()
                  .strict()
                  .typeError(
                    formatMessage({
                      id: 'Settings.review-workflows.validation.stage.permissions.role.number',
                      defaultMessage: 'Role must be of type number',
                    })
                  ).required,
                action: yup.string().required({
                  id: 'Settings.review-workflows.validation.stage.permissions.action.required',
                  defaultMessage: 'Action is a required argument',
                }),
              })
            )
            .strict(),
        })
      )
      .min(1),
  });

  try {
    await schema.validate(values, { abortEarly: false, context: values });

    return true;
  } catch (error) {
    let errors = {};

    if (error instanceof yup.ValidationError) {
      error.inner.forEach((error) => {
        set(errors, error.path, error.message);
      });
    }

    return errors;
  }
}
