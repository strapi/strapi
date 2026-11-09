import type { CompatResult } from '../types';

export const ok = (body: unknown, cookies?: string[]): CompatResult => ({
  status: 200,
  body,
  ...(cookies && cookies.length > 0 ? { cookies } : {}),
});
