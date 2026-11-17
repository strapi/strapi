/**
 * What the plugin says about `trustedOrigins` entries, for the configuration and for the
 * environment variable Better Auth reads next to it.
 */

/**
 * Better Auth adds this comma separated list to the trusted origins, on every request it answers
 * (`getTrustedOrigins` in `better-auth/dist/context/helpers.mjs`).
 */
export const TRUSTED_ORIGINS_ENV = 'BETTER_AUTH_TRUSTED_ORIGINS';

/** The entries of `BETTER_AUTH_TRUSTED_ORIGINS`, trimmed, as Better Auth splits it on commas. */
export const originsFromEnv = (envVars: Record<string, string | undefined>): string[] =>
  (envVars[TRUSTED_ORIGINS_ENV] ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

/** Whether Better Auth reads the entry as a pattern: `*` and `?` are its wildcards. */
export const hasWildcard = (origin: string) => /[*?]/.test(origin);

/** A character as itself in a regular expression. */
const literal = (char: string) => char.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

/**
 * Whether the scheme part of a pattern, read as Better Auth reads it, can be `http` or `https`: `*`
 * and `?` stand for characters other than a slash, and a backslash makes the next one literal.
 * Custom schemes (`exp`, `myapp`) cannot, so a pattern with one matches no web origin.
 */
const schemeCanBeWeb = (scheme: string) => {
  let source = '';

  for (let i = 0; i < scheme.length; i += 1) {
    const char = scheme[i];

    if (char === '\\') {
      if (i < scheme.length - 1) {
        i += 1;
        source += literal(scheme[i]);
      }
    } else if (char === '?') {
      source += '[^/\\\\]';
    } else if (char === '*') {
      source += '[^/\\\\]*';
    } else {
      source += literal(char);
    }
  }

  // Case does not matter here: a pattern that cannot match is refused all the same
  const pattern = new RegExp(`^${source}$`, 'i');

  return pattern.test('http') || pattern.test('https');
};

/** Whether the scheme of an entry (none counts) is one that a web page can have. */
const isWebEntry = (entry: string) => {
  const schemeEnd = entry.indexOf('://');

  return schemeEnd === -1 || schemeCanBeWeb(entry.slice(0, schemeEnd));
};

/**
 * Whether an entry that a web page can match has a backslash in it, which is refused wherever it
 * is. No real origin has one, and to Better Auth's matcher it is an escape (only `/` ends a
 * segment), which can hide what an entry does: `https://app\.example.com*` is the start of a host
 * (it trusts `https://app.example.com.evil.net`), and anything that cut the entry at the backslash
 * to look at the host would see `https://app` and miss the `*`. Refused up front, the rules below
 * do not have to read escapes. A custom scheme (a native app's deep link) is left alone: it
 * matches no web origin, and an escape in its path is its own business.
 */
export const hasBackslash = (origin: string) => {
  const entry = origin.trim();

  return entry.includes('\\') && isWebEntry(entry);
};

/**
 * Whether a pattern trusts every origin, which for Better Auth is the same as having no origin
 * check: it asks, for each origin of a request, whether it matches one of the trusted ones.
 *
 * Better Auth reads a trusted origin as a glob (`wildcard.mjs`, `matchesOriginPattern` in
 * `better-auth/dist/auth/trusted-origins.mjs`), so what counts is what the glob matches, not how
 * the entry looks:
 *
 * - `*` and `?` are wildcards, `/` separates segments and empty segments are skipped. (A backslash
 *   escapes the next character, but `hasBackslash` refuses those entries before this is asked, so
 *   only `/` ends the host here.) The origin it is matched against has no path, so `https://*` and
 *   `https://*` followed by `/*`, `/**` or `/` all match the same origins, and so do `/**` and `**`.
 * - With `://` in it the pattern is matched against the whole origin, scheme included. Without,
 *   against the host (and port) alone, whatever the scheme.
 *
 * So the host is what stands between the scheme and the first `/`, without its port.
 * When that holds nothing but wildcards and dots, it names no host, and the pattern matches every
 * host of the scheme. It needs a `*` for that (`?` is one character, so a lone `?` is a host of
 * one character), unless something follows the host: a `**` segment there takes in whatever is
 * left of the host, so `?/**` is every host.
 * An entry with no wildcard in it is compared as it is written, and trusts that origin alone.
 *
 * It trusts every origin when the scheme is one that web pages come from, or none.
 *
 * A pattern with a custom scheme (`exp://**`, `myapp://*`) matches no web origin: native apps need
 * those, so they are only warned about. `https://*.example.com` names a host and is only warned
 * about too.
 *
 * `trusted-origins-match.vitest.test.ts` runs Better Auth's own matcher against the same patterns,
 * so that this stays what it says.
 */
export const trustsEveryOrigin = (origin: string) => {
  const entry = origin.trim();

  // Without a wildcard Better Auth compares the entry with the origin as written
  if (!hasWildcard(entry)) {
    return false;
  }

  if (!isWebEntry(entry)) {
    return false;
  }

  const schemeEnd = entry.indexOf('://');
  const rest = entry.slice(schemeEnd === -1 ? 0 : schemeEnd + 3).replace(/^\/+/, '');
  const [authority] = rest.split('/', 1);
  const hasTail = rest.length > authority.length;
  const host = authority.replace(/:[0-9*?]*$/, '');

  if (host === '') {
    return hasTail;
  }

  return /^[*?.]+$/.test(host) && (hasTail || host.includes('*'));
};

/**
 * Whether a pattern matches a host by its start, so that it also trusts every host that begins
 * with the same text: `https://app.example.com/**` trusts `https://app.example.com.evil.net`, a
 * name that anyone can register. Better Auth's matcher does that in two cases (for the entries
 * that `trustsEveryOrigin` does not already refuse):
 *
 * - a `**` segment right after the host, with no port: a segment `**` needs no separator before it,
 *   and the origin has no path, so it takes in what is left of the host. (`/**` after a port, or
 *   after another segment, or after an empty one such as `//**`, does not.)
 * - a host that ends in `*` (or in `*` and some `?`): `app*`, `app.example.*`, `192.168.1.*`.
 *   A `*` that the host goes on after (`*.example.com`) is anchored, and so is a port wildcard.
 *
 * Only for the schemes a web page can have; a custom scheme (`exp://*\/**`) matches no web origin.
 * `trusted-origins-match.vitest.test.ts` checks this against Better Auth's matcher too.
 */
export const matchesHostPrefix = (origin: string) => {
  const entry = origin.trim();

  if (!hasWildcard(entry)) {
    return false;
  }

  if (!isWebEntry(entry)) {
    return false;
  }

  const schemeEnd = entry.indexOf('://');
  const rest = entry.slice(schemeEnd === -1 ? 0 : schemeEnd + 3).replace(/^\/+/, '');
  const [authority] = rest.split('/', 1);
  const host = authority.replace(/:[0-9*?]*$/, '');

  if (host === '') {
    return false;
  }

  const hasPort = host !== authority;
  const globTail = !hasPort && rest.split('/')[1] === '**';

  return globTail || /\*\?*$/.test(host);
};
