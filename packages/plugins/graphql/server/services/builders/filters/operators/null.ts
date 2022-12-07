const NULL_FIELD_NAME = 'null';

export default () => ({
  fieldName: NULL_FIELD_NAME,

  strapiOperator: '$null',

  add(t) {
    return t.boolean();
  },
});
