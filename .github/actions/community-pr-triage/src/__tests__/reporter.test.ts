import { describe, it, expect } from 'vitest';
import { groupByPriority, formatStats } from '../reporter.js';
import type { ScoredPR } from '../types.js';

const makeScoredPR = (overrides: Partial<ScoredPR> = {}): ScoredPR => ({
  pr: {
    number: 1,
    title: 'test',
    author: 'user',
    body: '',
    labels: ['pr: fix'],
    additions: 10,
    deletions: 5,
    changedFiles: 1,
    createdAt: new Date().toISOString(),
    state: 'open',
    isDraft: false,
    mergedAt: null,
    closedAt: null,
    ciStatus: 'passing',
    files: [],
  },
  linkedIssues: [],
  value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 30 },
  complexity: 'low',
  priority: 'low',
  area: 'admin',
  areaTier: 'medium',
  prType: 'fix',
  isQuickWin: true,
  ...overrides,
});

describe('groupByPriority', () => {
  it('groups PRs into priority tiers', () => {
    const prs = [
      makeScoredPR({ priority: 'urgent' }),
      makeScoredPR({ priority: 'low' }),
      makeScoredPR({ priority: 'urgent' }),
      makeScoredPR({ priority: 'high' }),
    ];
    const grouped = groupByPriority(prs);
    expect(grouped.urgent).toHaveLength(2);
    expect(grouped.high).toHaveLength(1);
    expect(grouped.normal).toHaveLength(0);
    expect(grouped.low).toHaveLength(1);
  });
});

describe('formatStats', () => {
  it('returns summary stats string', () => {
    const prs = [
      makeScoredPR({ isQuickWin: true }),
      makeScoredPR({ isQuickWin: false, complexity: 'high' }),
    ];
    const stats = formatStats(prs);
    expect(stats).toContain('2 community PRs');
    expect(stats).toContain('1 quick win');
  });
});
