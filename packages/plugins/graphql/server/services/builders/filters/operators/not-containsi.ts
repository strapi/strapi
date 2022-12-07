const NOT_CONTAINSI_FIELD_NAME = 'notContainsi';

export default () => ({
  fieldName: NOT_CONTAINSI_FIELD_NAME,

  strapiOperator: '$notContainsi',

  add(t, type) {
    return t.field({ type });
  },
});
