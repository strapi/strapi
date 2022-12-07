const CONTAINSI_FIELD_NAME = 'containsi';

export default () => ({
  fieldName: CONTAINSI_FIELD_NAME,

  strapiOperator: '$containsi',

  add(t, type) {
    return t.field({ type });
  },
});
