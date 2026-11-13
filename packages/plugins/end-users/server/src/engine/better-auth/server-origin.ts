/**
 * The origin (`https://api.example.com`) every absolute URL of the engine is built on: the base of
 * the links in emails, of redirects, and of the Request handed to Better Auth.
 *
 * It comes from Strapi's own configuration and nowhere else. It is never taken from the request: a
 * `Host` (or `X-Forwarded-Host`) header the client chose would put an attacker's address in a
 * password reset link, and the token in it would go with it.
 */
interface ConfigLike {
  get(path: string): unknown;
}

/** `server.url` when the project set it, otherwise the address Strapi derived from host and port. */
const SOURCES = ['server.url', 'server.absoluteUrl'];

export const resolveServerOrigin = (config: ConfigLike): string => {
  for (const source of SOURCES) {
    const value = config.get(source);

    if (typeof value !== 'string' || value === '') {
      continue;
    }

    try {
      const url = new URL(value);

      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.origin;
      }
    } catch {
      // not an absolute URL (a path-only `server.url`): the next source
    }
  }

  throw new Error(
    "end-users: set server.url in config/server.js (the server's public URL, for example " +
      '"https://api.example.com"). Links in emails and redirects are built on it, and are never ' +
      "built from the request's Host header."
  );
};
