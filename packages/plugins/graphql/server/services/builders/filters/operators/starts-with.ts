const STARTS_WITH_FIELD_NAME = 'startsWith';

export default () => ({
  fieldName: STARTS_WITH_FIELD_NAME,

  strapiOperator: '$startsWith',

  add(t, type) {
    return t.field({ type });
  },
});
