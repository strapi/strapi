/**
 * What the native sign-in accepts as a username: Better Auth's username plugin (1.7.x) with its
 * defaults, which the engine uses. A name is checked as typed, before it is lower-cased: between
 * `MIN` and `MAX` characters, letters and digits, `_` and `.` only. Users & Permissions accepted
 * anything, so a migrated user can hold a name this refuses.
 */
const MIN_LENGTH = 3;
const MAX_LENGTH = 30;
const ALLOWED = /^[a-zA-Z0-9_.]+$/;

export const isNativeUsername = (username: string): boolean =>
  username.length >= MIN_LENGTH && username.length <= MAX_LENGTH && ALLOWED.test(username);
