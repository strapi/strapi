export const REDACTED = '[REDACTED]';

// Layer 1a: key names (substring match) whose value must be masked wherever they appear.
const SECRET_KEY_PATTERN =
  /(secret|password|passphrase|salt|token|api[_-]?key|access[_-]?key|license[_-]?key|private[_-]?key|encryption[_-]?key|credential|provider[_-]?options|connection[_-]?string|mnemonic|seed[_-]?phrase|authorization|bearer)/i;

// Layer 1b: short, ambiguous key names matched EXACTLY (case-insensitive), so they
// do not over-match as substrings (e.g. `pass` must not redact `compass`/`bypass`,
// and this still catches a nested SMTP `auth.pass`).
const SECRET_KEY_EXACT = new Set(['pass', 'pwd', 'passwd', 'dsn']);
// camelCase password suffixes (capitalized), e.g. `smtpAuthPass`, `dbPwd` — the
// capital letter distinguishes them from lowercase look-alikes (`compass`, `bypass`).
const SECRET_KEY_SUFFIX = /[a-z](Pass|Pwd|Passwd)$/;
// separator-delimited short secret names, e.g. `auth.pass`, `db_pwd`, `x-pass`.
const SECRET_KEY_DELIMITED = /(^|[._-])(pass|pwd|passwd|dsn)([._-]|$)/i;

const isSecretKey = (key: string): boolean =>
  SECRET_KEY_PATTERN.test(key) ||
  SECRET_KEY_EXACT.has(key.toLowerCase()) ||
  SECRET_KEY_SUFFIX.test(key) ||
  SECRET_KEY_DELIMITED.test(key);

// Layer 3: string values that look like secrets regardless of their key.
// Real JWTs are base64url-encoded and the header segment always begins with
// `eyJ` (the base64url encoding of `{"`), so requiring that prefix avoids
// matching arbitrary three-part dotted strings like semver versions
// (e.g. "5.50.1", "18.3.1").
const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const LONG_TOKEN_PATTERN = /^[A-Fa-f0-9]{32,}$|^[A-Za-z0-9+/]{40,}={0,2}$/;
// Credentials embedded in a URL authority: `user:pass@` or `:pass@` (empty user,
// as in `redis://:password@host`).
const URL_WITH_CREDENTIALS = /^[a-z][a-z0-9+.-]*:\/\/[^/@\s]*:[^/@\s]+@/i;
// PEM private key blocks (certificates are public, so only PRIVATE KEY is masked).
const PEM_PRIVATE_KEY_PATTERN = /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----/;
// URLs whose secret is carried in the host/path rather than a `user:pass@` authority:
// chat webhooks and error-tracking DSNs.
const SECRET_URL_PATTERN =
  /^https:\/\/hooks\.slack\.com\/services\/|^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/|:\/\/[^/@\s]+@[^/\s]*\bsentry\.io\b/i;

// Well-known provider secret token formats, matched against the whole value. The
// prefixes are specific enough to have negligible false-positive risk, so they
// mask a value even under an innocuous key (e.g. `key: 'sk_live_...'`).
// `pk_` (publishable) keys are intentionally excluded — they are public by design.
const PROVIDER_SECRET_PATTERN = new RegExp(
  [
    '^(sk|rk)_(live|test)_[A-Za-z0-9]{8,}$', // Stripe secret / restricted
    '^whsec_[A-Za-z0-9]{16,}$', // Stripe webhook signing secret
    '^(gh[posru]_|github_pat_)[A-Za-z0-9_]{20,}$', // GitHub tokens / fine-grained PAT
    '^xox[baprs]-[A-Za-z0-9-]{10,}$', // Slack tokens
    '^(AKIA|ASIA)[A-Z0-9]{16}$', // AWS access key id
    '^SG\\.[A-Za-z0-9_-]{16,}\\.[A-Za-z0-9_-]{16,}$', // SendGrid
    '^AIza[A-Za-z0-9_-]{20,}$', // Google API key
    '^ya29\\.[A-Za-z0-9_-]{20,}$', // Google OAuth access token
    '^glpat-[A-Za-z0-9_-]{16,}$', // GitLab personal access token
    '^(shpat|shpss|shpca|shppa)_[A-Za-z0-9]{20,}$', // Shopify
    '^dop_v1_[a-f0-9]{40,}$', // DigitalOcean
    '^re_[A-Za-z0-9_]{16,}$', // Resend
    '^nfp_[A-Za-z0-9]{20,}$', // Netlify
    '^EAAA[A-Za-z0-9_-]{20,}$', // Square
  ].join('|')
);

const looksSecret = (value: string): boolean =>
  JWT_PATTERN.test(value) ||
  LONG_TOKEN_PATTERN.test(value) ||
  URL_WITH_CREDENTIALS.test(value) ||
  PROVIDER_SECRET_PATTERN.test(value) ||
  PEM_PRIVATE_KEY_PATTERN.test(value) ||
  SECRET_URL_PATTERN.test(value);

export interface ScrubOptions {
  appRoot?: string;
  homeDir?: string;
  extraPaths?: string[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const relativize = (value: string, appRoot?: string, homeDir?: string): string => {
  if (appRoot && (value === appRoot || value.startsWith(`${appRoot}/`))) {
    return `<app>${value.slice(appRoot.length)}`;
  }
  if (homeDir && (value === homeDir || value.startsWith(`${homeDir}/`))) {
    return `<home>${value.slice(homeDir.length)}`;
  }
  return value;
};

const deleteAtPath = (target: unknown, path: string): void => {
  const segments = path.split('.');
  let node: unknown = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    if (!isPlainObject(node)) {
      return;
    }
    node = node[segments[i]];
  }
  const lastKey = segments[segments.length - 1];
  if (isPlainObject(node) && lastKey in node) {
    node[lastKey] = REDACTED;
  }
};

const walk = (value: unknown, appRoot?: string, homeDir?: string): unknown => {
  if (typeof value === 'string') {
    if (looksSecret(value)) {
      return REDACTED;
    }
    return relativize(value, appRoot, homeDir);
  }
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, appRoot, homeDir));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === '__proto__') {
        continue; // never write through the Object.prototype setter
      }
      // A secret-named key always collapses wholesale, regardless of the value's
      // type. Recursing into it (e.g. for `apiToken: { salt, ... }`) would leak
      // any inner value whose own key/value doesn't independently match a
      // masking pattern (e.g. `providerOptions.auth.pass`), so there is nothing
      // safe to preserve underneath a secret-named container.
      out[key] = isSecretKey(key) ? REDACTED : walk(val, appRoot, homeDir);
    }
    return out;
  }
  // Any other object type — Buffer, Date, Map, Set, class instances, etc. —
  // is not a plain data container we can safely walk (Object.entries on a
  // Buffer leaks its bytes, a Date serializes to `{}`), so redact defensively.
  if (value !== null && typeof value === 'object') {
    return REDACTED;
  }
  return value;
};

export const scrub = (value: unknown, options: ScrubOptions = {}): unknown => {
  const cloned = walk(value, options.appRoot, options.homeDir);
  for (const path of options.extraPaths ?? []) {
    deleteAtPath(cloned, path);
  }
  return cloned;
};
