import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ScoredPR } from './types.js';

const CACHE_PATH = 'reports/triage-cache.json';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface SyncStats {
  created: number;
  updated: number;
  closed: number;
  createdPRNumbers: number[];
}

export interface TriageCache {
  timestamp: string;
  scoredPRs: ScoredPR[];
  mergedPRNumbers: number[];
  syncStats?: SyncStats;
}

export function writeCache(cache: TriageCache): void {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
  console.log(`Cache written to: ${CACHE_PATH}\n`);
}

export function readCache(): TriageCache | null {
  try {
    const raw = readFileSync(CACHE_PATH, 'utf-8');
    const cache: TriageCache = JSON.parse(raw);
    const age = Date.now() - new Date(cache.timestamp).getTime();
    if (age > CACHE_TTL_MS) {
      console.log('Cache is stale (>4h), fetching fresh data.\n');
      return null;
    }
    const ageMin = Math.round(age / 60000);
    console.log(`Using cached data from ${ageMin} minute(s) ago.\n`);
    return cache;
  } catch {
    return null;
  }
}
