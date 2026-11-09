import type { CompatResult } from '../types';

export const ok = (body: unknown): CompatResult => ({ status: 200, body });
