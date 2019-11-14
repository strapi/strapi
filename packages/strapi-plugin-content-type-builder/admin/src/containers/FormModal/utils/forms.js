import * as yup from 'yup';
import { translatedErrors as errorsTrads } from 'strapi-helper-plugin';

yup.addMethod(yup.mixed, 'defined', function() {
  return this.test(
    'defined',
    errorsTrads.required,
    value => value !== undefined
  );
});

yup.addMethod(yup.string, 'unique', function(message, allReadyTakenValues) {
  console.log({ allReadyTakenValues });
  return this.test('unique', message, function(string) {
    console.log({ string });
    return !allReadyTakenValues.includes(string);
  });
});

const forms = {
  contentType: {
    schema(allReadyTakenValues) {
      return yup.object().shape({
        name: yup
          .string()
          .required()
          .unique('duplicate key', allReadyTakenValues),
      });
    },
    form: {
      base: {
        name: 'name',
        type: 'string',
        validations: {
          required: true,
        },
      },
    },
  },
  // },
};

export default forms;
