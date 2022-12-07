const GTE_FIELD_NAME = 'gte';

export default () => ({
  fieldName: GTE_FIELD_NAME,

  strapiOperator: '$gte',

  add(t, type) {
    return t.field({ type });
  },
});
