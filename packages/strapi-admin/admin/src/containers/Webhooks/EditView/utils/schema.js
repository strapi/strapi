import * as yup from 'yup';

const createYupSchema = (type, validations, translatedErrors = {}) => {
  let schema = yup.mixed();

  if (['text'].includes(type)) {
    schema = yup.string(translatedErrors.string);
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
