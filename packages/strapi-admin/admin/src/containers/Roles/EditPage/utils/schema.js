import * as yup from 'yup';

const schema = yup.object().shape({
  name: yup.string(),
});

export default schema;
