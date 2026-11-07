/**
 * The one spelling of a username the plugin stores and looks up: in lower case. This is what Better
 * Auth's username plugin (1.7.x) does by default: `username.toLowerCase()`, with no trimming (a
 * username with a space in it is not valid in the first place), before it looks the name up and
 * before it stores it. Signing in by username lower-cases what it is given the same way, so a
 * username stored in mixed case through the Document Service (the Content Manager, a script) could
 * never be signed in with.
 *
 * `toLowerCase`, not `toLocaleLowerCase`: the result must not depend on the server's locale. If the
 * engine ever configures the plugin's `usernameNormalization`, this is the one place to follow it.
 */
export const normalizeUsername = (value: string): string => value.toLowerCase();
