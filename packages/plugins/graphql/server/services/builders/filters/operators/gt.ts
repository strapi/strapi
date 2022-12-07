const GT_FIELD_NAME = 'gt';

export default () => ({
  fieldName: GT_FIELD_NAME,

  strapiOperator: '$gt',

  add(t, type) {
    return t.field({ type });
  },
});
