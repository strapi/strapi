export default function isFieldTypeNumber(type) {
  return ['integer', 'biginteger', 'decimal', 'float', 'number'].includes(type);
}
