const CSV_LINE_SEPARATOR = '\r\n';
const CSV_BOM = '\uFEFF';
const FORMULA_TRIGGER_CHARACTERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Turns any value into its CSV cell representation, before escaping.
 * Objects and arrays are serialized as JSON so the export keeps their shape
 * instead of collapsing to `[object Object]`.
 */
const stringifyCsvValue = (value: unknown): string => {
  // Checked before the `typeof value === 'object'` branch below, which null also satisfies
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) === true ? '' : value.toISOString();
  }

  if (typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value);

      // JSON.stringify returns undefined for non-serializable values
      return serialized === undefined ? '' : serialized;
    } catch {
      // Circular references (and BigInt inside objects) are not serializable — we keep the cell
      // empty rather than leaking a partial/misleading payload.
      return '';
    }
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return '';
  }

  return String(value);
};

const escapeCsvValue = (value: unknown): string => {
  let stringValue = stringifyCsvValue(value);

  if (typeof value === 'string' && FORMULA_TRIGGER_CHARACTERS.includes(stringValue.charAt(0))) {
    stringValue = `'${stringValue}`;
  }

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const serializeCsvLine = (values: unknown[]): string => {
  return values.map(escapeCsvValue).join(',') + CSV_LINE_SEPARATOR;
};

export { escapeCsvValue, serializeCsvLine, CSV_BOM };
