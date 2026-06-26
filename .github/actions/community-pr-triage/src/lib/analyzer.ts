import type { CommunityPR } from './types.js';

export function isQuickWin(pr: CommunityPR): boolean {
  return pr.additions + pr.deletions <= 100 && pr.changedFiles <= 5;
}

export function detectArea(labels: string[], files: string[]): string | null {
  const sourceLabel = labels.find((l) => l.startsWith('source: '));
  if (sourceLabel) {
    const m = sourceLabel.match(/source:\s*(?:core:|plugin:)(.+)/);
    if (m) return m[1].trim();
  }
  for (const f of files) {
    const m = f.match(/packages\/(?:core|plugins)\/([^/]+)/);
    if (m) return m[1];
  }
  return null;
}

export function daysSince(dateStr: string): number {
  const ms = new Date(dateStr).getTime();
  if (Number.isNaN(ms)) throw new Error(`Invalid date: ${dateStr}`);
  return Math.floor((Date.now() - ms) / 86_400_000);
}

export function isStale(pr: CommunityPR): boolean {
  return daysSince(pr.updatedAt) > 30;
}

export function isNewThisWeek(pr: CommunityPR): boolean {
  return daysSince(pr.createdAt) <= 7;
}
