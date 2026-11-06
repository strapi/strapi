/**
 * Fields that must never reach a client: tokens, hashes, secrets and keys.
 *
 * Strapi's sanitizers drop a `private` attribute from every Content API response, so no route or
 * populate can leak one by accident. The list is fixed, and it is added to the fields Better Auth
 * itself marks `returned: false`; neither can be switched off from a project.
 *
 * Keyed by the generated content type's singular name (`two-factor`, not `twoFactor`; `jwk`, not
 * `jwks`), then by the engine's field key (`token`). The attribute name a field is stored under is
 * checked as well (see `isPrivateField`), because a Better Auth plugin can store a field under a
 * name that is not its key (`fieldName`).
 *
 * `verification.identifier` is on the list because the engine puts the token in it
 * (`reset-password:<token>`, and the same for magic links and one-time codes).
 */
export const PRIVATE_FIELDS: Readonly<Record<string, readonly string[]>> = {
  // The admin plugin's fields. `role` is a Better Auth role name (Strapi's roles live in
  // `user.roles`); `banned`, `banReason` and `banExpires` are moderation state, and `failedSignIns` and `lockedUntil` the sign-in lockout's, which the signed-in
  // user's own `/api/users/me` has no business showing, and which a front end reads from the 403 a
  // banned user gets. Only the Content API sanitizers act on `private`: Better Auth's own responses
  // (`returned`), its ban check (it reads the stored row) and the plugin's strategy are untouched,
  // and the Content Manager still shows these fields to administrators.
  user: ['role', 'banned', 'banReason', 'banExpires', 'failedSignIns', 'lockedUntil'],
  session: ['token'],
  account: ['password', 'accessToken', 'refreshToken', 'idToken'],
  verification: ['identifier', 'value'],
  'two-factor': ['secret', 'backupCodes'],
  passkey: ['publicKey'],
  jwk: ['privateKey'],
};

/**
 * Whether a field is private: marked `returned: false` by the engine, or in the fixed list under
 * its engine key or under the attribute name it is stored as.
 */
export const isPrivateField = (
  contentType: string,
  fieldKey: string,
  attribute: string,
  field: { returned?: boolean }
): boolean => {
  const fixed = PRIVATE_FIELDS[contentType] ?? [];

  return field.returned === false || fixed.includes(fieldKey) || fixed.includes(attribute);
};

/**
 * Fields that stay in the table because the engine's plugins read them, but that the Content Manager
 * never shows: the `visible: false` of a Strapi attribute. Keyed like `PRIVATE_FIELDS`.
 *
 * `user.role` is the admin plugin's (its hooks need it). It is private as well, so it never reaches a
 * response, and an editor changing it by hand would only confuse the plugin: end users get their
 * Strapi roles from `user.roles`.
 */
export const HIDDEN_FIELDS: Readonly<Record<string, readonly string[]>> = {
  user: ['role'],
};

export const isHiddenField = (
  contentType: string,
  fieldKey: string,
  attribute: string
): boolean => {
  const hidden = HIDDEN_FIELDS[contentType] ?? [];

  return hidden.includes(fieldKey) || hidden.includes(attribute);
};

/**
 * Fields a Content API request never writes: the `writable: false` of a Strapi attribute. Keyed like
 * `PRIVATE_FIELDS`. The Document Service ignores the flag, so the engine and the plugin's own rules
 * still write these; only the Content API's input sanitizer strips them, so a role granted
 * `user.update` can never set one.
 *
 * `user.role` is the admin plugin's. It is private and hidden already; engine writes go through the
 * Document Service, never the Content API, so nothing legitimate needs a request to set it.
 */
export const READ_ONLY_FIELDS: Readonly<Record<string, readonly string[]>> = {
  user: ['role'],
};

export const isReadOnlyField = (
  contentType: string,
  fieldKey: string,
  attribute: string
): boolean => {
  const readOnly = READ_ONLY_FIELDS[contentType] ?? [];

  return readOnly.includes(fieldKey) || readOnly.includes(attribute);
};
