const LTE_FIELD_NAME = 'lte';

export default () => ({
  fieldName: LTE_FIELD_NAME,

  strapiOperator: '$lte',

  add(t, type) {
    return t.field({ type });
  },
});
