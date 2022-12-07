const BETWEEN_FIELD_NAME = 'between';

export default () => ({
  fieldName: BETWEEN_FIELD_NAME,

  strapiOperator: '$between',

  add(t, type) {
    return t.field({ type: [type] });
  },
});
