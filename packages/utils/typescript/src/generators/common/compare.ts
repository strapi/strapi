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

/**
 * Orders strings like `localeCompare` on an English or `C` locale machine, whatever the locale of
 * the machine. The schema generators come from develop and use `localeCompare`: an explicit
 * locale keeps their output where it was already stable, instead of reordering mixed-case or
 * punctuated keys like `compareCodeUnits` would.
 */
export const compareEnglish = (a: string, b: string) => a.localeCompare(b, 'en');
