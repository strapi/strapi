/**
 * Returns a shallow copy of an admin user payload with `email` lowercased.
 *
 * Admin email uniqueness depends on values being stored canonically lowercase: `admin_users.email`
 * is a plain unique index with no guaranteed case-insensitive collation across SQLite/Postgres/MySQL,
 * and the strict Yup email validator rejects mixed-case input rather than normalizing it. Controllers
 * must therefore lowercase the email before validation, the uniqueness check, and persistence
 * (mirroring `user.create`). The `email` key is only rewritten when present, so partial updates that
 * omit it are left untouched.
 */
export const normalizeEmail = <T extends object>(payload: T): T => {
  const { email } = payload as { email?: unknown };

  if (typeof email === 'string') {
    return { ...payload, email: email.toLowerCase() };
  }

  return payload;
};
