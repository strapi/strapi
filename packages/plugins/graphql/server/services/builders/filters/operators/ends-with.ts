const ENDS_WITH_FIELD_NAME = 'endsWith';

export default () => ({
  fieldName: ENDS_WITH_FIELD_NAME,

  strapiOperator: '$endsWith',

  add(t, type) {
    return t.field({ type });
  },
});
