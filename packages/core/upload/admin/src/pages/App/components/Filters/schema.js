import * as Yup from 'yup';

export const filterSchema = Yup.object({
  field: Yup.string().required(),
  comparator: Yup.string().required(),
  value: Yup.date()
    .when('field', {
      is: 'mime',
      then: Yup.string().required(),
    })
    .required(),
});
