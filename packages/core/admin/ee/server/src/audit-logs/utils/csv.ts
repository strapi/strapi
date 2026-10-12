const CSV_LINE_SEPARATOR = '\r\n';
const CSV_BOM = '\uFEFF';
const FORMULA_TRIGGER_CHARACTERS = ['=', '+', '-', '@', '\t', '\r'];

const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  let stringValue = typeof value === 'string' ? value : String(value);

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
