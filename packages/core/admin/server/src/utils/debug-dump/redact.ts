export const REDACTED = '[REDACTED]';

// Layer 1: key names whose value must be masked wherever they appear.
const SECRET_KEY_PATTERN =
  /(secret|password|passphrase|salt|token|api[_-]?key|private[_-]?key|encryption[_-]?key|credential|provider[_-]?options|connection[_-]?string)/i;

// Layer 3: string values that look like secrets regardless of their key.
// Real JWTs are base64url-encoded and the header segment always begins with
// `eyJ` (the base64url encoding of `{"`), so requiring that prefix avoids
// matching arbitrary three-part dotted strings like semver versions
// (e.g. "5.50.1", "18.3.1").
const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const LONG_TOKEN_PATTERN = /^[A-Fa-f0-9]{32,}$|^[A-Za-z0-9+/]{40,}={0,2}$/;
const URL_WITH_CREDENTIALS = /^[a-z][a-z0-9+.-]*:\/\/[^/@\s]+:[^/@\s]+@/i;

const looksSecret = (value: string): boolean =>
  JWT_PATTERN.test(value) || LONG_TOKEN_PATTERN.test(value) || URL_WITH_CREDENTIALS.test(value);

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
      out[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : walk(val, appRoot, homeDir);
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
