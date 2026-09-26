import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Resolves the `Authorization` header to use when talking to an npm registry,
 * reading the credentials the user has already configured in their `.npmrc`
 * (the same files npm/pnpm read: the project one, then the user one).
 *
 * npm stores per-registry credentials keyed by "nerf dart" — the registry URL
 * stripped of its protocol, e.g. `//registry.example.com/:_authToken=...`. This
 * mirrors that lookup (longest path match first, for registries served under a
 * sub-path) and expands `${ENV_VAR}` references like npm does.
 *
 * Returns `undefined` when no credentials are configured, so requests to public
 * registries stay unauthenticated exactly as before.
 */

const expandEnv = (value: string): string =>
  value.replace(/\$\{([^}]+)\}/g, (_match, name) => process.env[name] ?? '');

const parseNpmrc = (filePath: string): Record<string, string> => {
  const config: Record<string, string> = {};

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return config;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    const isComment = line.startsWith('#') || line.startsWith(';');
    const separatorIndex = line.indexOf('=');

    if (line && !isComment && separatorIndex !== -1) {
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      config[key] = value;
    }
  }

  return config;
};

// Build the candidate "nerf dart" keys for a registry URL, from the most
// specific (full path) to the least specific (host only).
const nerfDartCandidates = (registryUrl: string): string[] => {
  const { host, pathname } = new URL(registryUrl);
  const segments = pathname.split('/').filter(Boolean);

  const candidates: string[] = [];
  for (let i = segments.length; i >= 0; i -= 1) {
    const subPath = segments.slice(0, i).join('/');
    candidates.push(`//${host}/${subPath ? `${subPath}/` : ''}`);
  }

  return candidates;
};

export const getRegistryAuthHeader = (registryUrl: string, cwd: string): string | undefined => {
  // Project config overrides user config, so parse the user file first and let
  // the project file take precedence when merging.
  const npmrcFiles = [path.join(os.homedir(), '.npmrc'), path.join(cwd, '.npmrc')];

  const config: Record<string, string> = {};
  for (const file of npmrcFiles) {
    Object.assign(config, parseNpmrc(file));
  }

  for (const base of nerfDartCandidates(registryUrl)) {
    const authToken = config[`${base}:_authToken`];
    if (authToken) {
      return `Bearer ${expandEnv(authToken)}`;
    }

    const auth = config[`${base}:_auth`];
    if (auth) {
      return `Basic ${expandEnv(auth)}`;
    }
  }

  // Legacy, non-scoped credentials.
  if (config._authToken) {
    return `Bearer ${expandEnv(config._authToken)}`;
  }

  if (config._auth) {
    return `Basic ${expandEnv(config._auth)}`;
  }

  return undefined;
};
