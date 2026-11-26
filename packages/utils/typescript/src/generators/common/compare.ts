/**
 * Orders strings like `localeCompare` on an English machine, whatever the locale of the machine.
 * Without an explicit locale, `localeCompare` uses the machine locale (in Danish, `aa` sorts after
 * `z`), so two machines could generate the same types in a different order.
 */
export const compareEnglish = (a: string, b: string) => a.localeCompare(b, 'en');
