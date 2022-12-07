const LT_FIELD_NAME = 'lt';

export default () => ({
  fieldName: LT_FIELD_NAME,

  strapiOperator: '$lt',

  add(t, type) {
    return t.field({ type });
  },
});
