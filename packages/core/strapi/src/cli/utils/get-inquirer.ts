type InquirerAPI = typeof import('inquirer');

let cached: Promise<InquirerAPI> | undefined;

/** Loads Inquirer v9 via dynamic import (CJS-safe) and caches the default export. */
export async function getInquirer(): Promise<InquirerAPI> {
  cached ??= import('inquirer').then((m) => m.default);
  return cached;
}
