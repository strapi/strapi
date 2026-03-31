import { describe, it, expect } from 'vitest';
import { selectSprintPRs, groupByArea, formatSprintUpdate } from '../sprint.js';
import type { ScoredPR, GitHubPR, PriorityTier, ComplexityTier } from '../types.js';

const makeScoredPR = (
  overrides: Omit<Partial<ScoredPR>, 'pr'> & { pr?: Partial<GitHubPR> } = {}
): ScoredPR => {
  const { pr: prOverrides, ...rest } = overrides;
  return {
    pr: {
      number: 1,
      title: 'test',
      author: 'user',
      body: '',
      labels: ['pr: fix'],
      additions: 10,
      deletions: 5,
      changedFiles: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-02-15T00:00:00Z',
      state: 'open',
      isDraft: false,
      mergedAt: null,
      closedAt: null,
      ciStatus: 'passing',
      files: [],
      ...prOverrides,
    },
    linkedIssues: [],
    value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 30 },
    complexity: 'low' as ComplexityTier,
    priority: 'normal' as PriorityTier,
    area: 'admin',
    areaTier: 'medium',
    prType: 'fix',
    isQuickWin: false,
    ...rest,
  };
};

describe('selectSprintPRs', () => {
  it('selects up to count PRs', () => {
    const prs = Array.from({ length: 20 }, (_, i) =>
      makeScoredPR({
        pr: { number: i + 1 },
        value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 50 - i },
      })
    );
    const result = selectSprintPRs(prs, 10);
    expect(result).toHaveLength(10);
  });

  it('prioritizes urgent/high PRs', () => {
    const prs = [
      makeScoredPR({
        pr: { number: 1 },
        priority: 'low',
        value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 100 },
      }),
      makeScoredPR({
        pr: { number: 2 },
        priority: 'urgent',
        value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 50 },
      }),
      makeScoredPR({
        pr: { number: 3 },
        priority: 'high',
        value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 40 },
      }),
    ];
    const result = selectSprintPRs(prs, 3);
    // Urgent and high should be picked first
    expect(result[0].pr.number).toBe(2);
    expect(result[1].pr.number).toBe(3);
  });

  it('includes quick wins', () => {
    const prs = [
      makeScoredPR({
        pr: { number: 1 },
        priority: 'urgent',
        value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 100 },
      }),
      makeScoredPR({
        pr: { number: 2 },
        priority: 'low',
        isQuickWin: true,
        value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 30 },
      }),
    ];
    const result = selectSprintPRs(prs, 10);
    expect(result.some((p) => p.pr.number === 2)).toBe(true);
  });

  it('includes enhancements/features', () => {
    const prs = [
      makeScoredPR({
        pr: { number: 1 },
        priority: 'urgent',
        value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 100 },
      }),
      makeScoredPR({
        pr: { number: 2 },
        prType: 'feature',
        priority: 'low',
        value: { base: 20, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 20 },
      }),
    ];
    const result = selectSprintPRs(prs, 10);
    expect(result.some((p) => p.pr.number === 2)).toBe(true);
  });

  it('does not duplicate PRs', () => {
    const prs = [
      makeScoredPR({
        pr: { number: 1 },
        priority: 'urgent',
        isQuickWin: true,
        prType: 'feature',
        value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 100 },
      }),
    ];
    const result = selectSprintPRs(prs, 10);
    expect(result).toHaveLength(1);
  });

  it('returns fewer than count when not enough PRs', () => {
    const prs = [makeScoredPR({ pr: { number: 1 } })];
    const result = selectSprintPRs(prs, 10);
    expect(result).toHaveLength(1);
  });
});

describe('groupByArea', () => {
  it('groups PRs by area', () => {
    const prs = [
      makeScoredPR({ area: 'admin', pr: { number: 1 } }),
      makeScoredPR({ area: 'admin', pr: { number: 2 } }),
      makeScoredPR({ area: 'upload', pr: { number: 3 } }),
    ];
    const groups = groupByArea(prs);
    expect(groups.get('admin')).toHaveLength(2);
    expect(groups.get('upload')).toHaveLength(1);
  });
});

describe('formatSprintUpdate', () => {
  it('includes date, PR count, and area grouping', () => {
    const prs = [
      makeScoredPR({ area: 'admin', pr: { number: 1 }, priority: 'urgent' }),
      makeScoredPR({ area: 'upload', pr: { number: 2 }, isQuickWin: true }),
    ];
    const md = formatSprintUpdate(prs, 100);
    expect(md).toContain('Sprint Recommendation');
    expect(md).toContain('**2** PRs');
    expect(md).toContain('**100** open community PRs');
    expect(md).toContain('### admin');
    expect(md).toContain('### upload');
    expect(md).toContain('#1');
    expect(md).toContain('#2');
  });

  it('includes Linear issue URLs when provided', () => {
    const prs = [makeScoredPR({ area: 'admin', pr: { number: 123 } })];
    const linearUrls = new Map([[123, 'https://linear.app/strapi/issue/CPR-42']]);
    const md = formatSprintUpdate(prs, 50, linearUrls);
    expect(md).toContain('https://linear.app/strapi/issue/CPR-42');
  });

  it('omits Linear URL when not available for a PR', () => {
    const prs = [makeScoredPR({ area: 'admin', pr: { number: 456 } })];
    const md = formatSprintUpdate(prs, 50, new Map());
    expect(md).not.toContain('linear.app');
  });
});
