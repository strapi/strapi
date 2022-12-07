const NE_FIELD_NAME = 'ne';

export default () => ({
  fieldName: NE_FIELD_NAME,

  strapiOperator: '$ne',

  add(t, type) {
    return t.field({ type });
  },
});
