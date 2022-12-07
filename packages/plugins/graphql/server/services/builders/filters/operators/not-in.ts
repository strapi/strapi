const NOT_IN_FIELD_NAME = 'notIn';

export default () => ({
  fieldName: NOT_IN_FIELD_NAME,

  strapiOperator: '$notIn',

  add(t, type) {
    return t.field({ type: [type] });
  },
});
