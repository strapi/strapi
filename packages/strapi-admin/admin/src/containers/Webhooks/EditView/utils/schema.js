import * as yup from 'yup';
import { translatedErrors } from 'strapi-helper-plugin';

const createYupSchema = form =>
  yup.object().shape(
    Object.keys(form).reduce((acc, current) => {
      const { type, validations } = form[current];
      acc[current] = createYupSchemaEntry(type, validations);

      return acc;
    }, {})
  );

const createYupSchemaEntry = (type, validations) => {
  let schema = yup.mixed();

  if (['text'].includes(type)) {
    schema = yup.string(translatedErrors.string).nullable();
  }

  if (['headers'].includes(type)) {
    schema = yup
      .array()
      .of(
        yup.object().shape({
          key: yup.string().required(),
          value: yup.string().required(),
        })
      )
      .nullable();
  }

  if (['events'].includes(type)) {
    schema = yup.array();
  }

  Object.keys(validations).forEach(validation => {
    const validationValue = validations[validation];

    switch (validation) {
      case 'required':
        schema = schema.required(translatedErrors.required);
        break;
      case 'regex':
        schema = schema.matches(validationValue, translatedErrors.regex);
        break;
      default:
    }
  });

  return schema;
};

export default createYupSchema;
