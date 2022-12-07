const OR_FIELD_NAME = 'or';

export default () => ({
  fieldName: OR_FIELD_NAME,

  strapiOperator: '$or',

  add(t, type) {
    return t.field({ type: [type] });
  },
});
