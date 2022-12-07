const AND_FIELD_NAME = 'and';

export default () => ({
  fieldName: AND_FIELD_NAME,

  strapiOperator: '$and',

  add(t, type) {
    return t.field({ type: [type] });
  },
});
