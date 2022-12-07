const CONTAINS_FIELD_NAME = 'contains';

export default () => ({
  fieldName: CONTAINS_FIELD_NAME,

  strapiOperator: '$contains',

  add(t, type) {
    return t.field({ type });
  },
});
