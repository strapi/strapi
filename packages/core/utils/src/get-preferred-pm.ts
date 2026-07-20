type PreferredPM = typeof import('preferred-pm').preferredPM;

let cached: Promise<PreferredPM> | undefined;

/** Loads preferred-pm v5 via dynamic import (CJS-safe) and caches the named export. */
export async function getPreferredPM(): Promise<PreferredPM> {
  cached ??= import('preferred-pm').then((m) => m.preferredPM);
  return cached;
}
