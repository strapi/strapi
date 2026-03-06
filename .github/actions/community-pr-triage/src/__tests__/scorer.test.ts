import { describe, it, expect } from 'vitest';
import { calculateValue, calculateComplexity, calculatePriority, isQuickWin } from '../scorer.js';
import type { GitHubPR, LinkedIssueData } from '../types.js';

const makePR = (overrides: Partial<GitHubPR> = {}): GitHubPR => ({
  number: 1,
  title: 'test',
  author: 'contributor',
  body: '',
  labels: ['pr: fix'],
  additions: 20,
  deletions: 5,
  changedFiles: 2,
  createdAt: new Date().toISOString(),
  state: 'open',
  isDraft: false,
  mergedAt: null,
  closedAt: null,
  ciStatus: 'passing',
  files: [],
  ...overrides,
});

const makeLinkedIssue = (overrides: Partial<LinkedIssueData> = {}): LinkedIssueData => ({
  issue: { number: 100, title: 'bug', labels: [], thumbsUp: 0, comments: 0, state: 'open' },
  severity: 'none',
  status: 'none',
  ...overrides,
});

describe('calculateValue', () => {
  it('scores a bug fix with no linked issues as base only', () => {
    const result = calculateValue(makePR({ labels: ['pr: fix'] }), [], 0);
    expect(result.base).toBe(30);
    expect(result.total).toBe(30);
  });

  it('adds severity from linked critical issue', () => {
    const linked = [makeLinkedIssue({ severity: 'critical', status: 'confirmed' })];
    const result = calculateValue(makePR({ labels: ['pr: fix'] }), linked, 0);
    expect(result.severity).toBe(50);
    expect(result.status).toBe(15);
    expect(result.total).toBe(95);
  });

  it('caps engagement at 40', () => {
    const linked = [
      makeLinkedIssue({
        issue: {
          number: 100,
          title: 'popular',
          labels: [],
          thumbsUp: 60,
          comments: 40,
          state: 'open',
        },
      }),
    ];
    const result = calculateValue(makePR({ labels: ['pr: fix'] }), linked, 0);
    expect(result.engagement).toBe(40);
  });

  it('applies urgency multiplier for old PRs', () => {
    const result = calculateValue(makePR({ labels: ['pr: enhancement'] }), [], 50);
    expect(result.urgency).toBe(2.0);
    expect(result.total).toBe(40);
  });

  it('uses highest severity when multiple issues linked', () => {
    const linked = [makeLinkedIssue({ severity: 'low' }), makeLinkedIssue({ severity: 'high' })];
    const result = calculateValue(makePR({ labels: ['pr: fix'] }), linked, 0);
    expect(result.severity).toBe(35);
  });

  it('scores dependency PR with base 5', () => {
    const result = calculateValue(makePR({ labels: ['pr: chore', 'source: dependencies'] }), [], 0);
    expect(result.base).toBe(5);
  });
});

describe('calculateComplexity', () => {
  it('returns low for small PR in low-risk area', () => {
    expect(calculateComplexity(20, 2, 'low')).toBe('low');
  });

  it('returns medium for mid-size PR', () => {
    expect(calculateComplexity(150, 5, 'high')).toBe('medium');
  });

  it('bumps up for critical area', () => {
    expect(calculateComplexity(30, 2, 'critical')).toBe('medium');
  });

  it('returns very_high for XL PR', () => {
    expect(calculateComplexity(1500, 20, 'high')).toBe('very_high');
  });

  it('clamps down for low-risk area', () => {
    expect(calculateComplexity(100, 3, 'low')).toBe('low');
  });
});

describe('calculatePriority', () => {
  it('maps 100+ to urgent', () => expect(calculatePriority(120)).toBe('urgent'));
  it('maps 70-99 to high', () => expect(calculatePriority(85)).toBe('high'));
  it('maps 50-69 to normal', () => expect(calculatePriority(55)).toBe('normal'));
  it('maps <50 to low', () => expect(calculatePriority(30)).toBe('low'));
});

describe('isQuickWin', () => {
  it('true when value >= 30 and complexity low', () => expect(isQuickWin(45, 'low')).toBe(true));
  it('false when value < 30', () => expect(isQuickWin(20, 'low')).toBe(false));
  it('false when complexity not low', () => expect(isQuickWin(80, 'medium')).toBe(false));
});
