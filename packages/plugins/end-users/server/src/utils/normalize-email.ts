/**
 * The one spelling of an email address the plugin stores and looks up: without surrounding white
 * space, in lower case. Better Auth lower-cases on its own but validates before it trims, and the
 * Document Service takes whatever it is given, so every path that writes an email goes through this.
 *
 * `toLowerCase`, not `toLocaleLowerCase`: the result must not depend on the server's locale.
 */
export const normalizeEmail = (value: string): string => value.trim().toLowerCase();
