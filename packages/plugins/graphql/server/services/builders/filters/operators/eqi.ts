const EQI_FIELD_NAME = 'eqi';

export default () => ({
  fieldName: EQI_FIELD_NAME,

  strapiOperator: '$eqi',

  add(t, type) {
    return t.field({ type });
  },
});
