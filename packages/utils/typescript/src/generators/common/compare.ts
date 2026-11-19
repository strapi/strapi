/**
 * Orders strings like `localeCompare` on an English machine, whatever the locale of the machine.
 * Without an explicit locale, `localeCompare` uses the machine locale (in Danish, `aa` sorts after
 * `z`), so two machines could generate the same types in a different order.
 */
export const compareEnglish = (a: string, b: string) => a.localeCompare(b, 'en');

/**
 * Orders strings by UTF-16 code units, like the default `Array.prototype.sort`. Unlike
 * `localeCompare`, the order does not depend on the locale of the machine, so the generated files
 * are the same everywhere.
 */
export const compareCodeUnits = (a: string, b: string) => {
  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
};
