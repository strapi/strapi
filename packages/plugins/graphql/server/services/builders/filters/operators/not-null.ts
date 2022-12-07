const NOT_NULL_FIELD_NAME = 'notNull';

export default () => ({
  fieldName: NOT_NULL_FIELD_NAME,

  strapiOperator: '$notNull',

  add(t) {
    return t.boolean();
  },
});
