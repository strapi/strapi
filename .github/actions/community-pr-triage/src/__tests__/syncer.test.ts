import { describe, it, expect } from 'vitest';
import {
  matchPRNumber,
  mapPriorityToLinear,
  mapLabelsToLinear,
  buildLabelIds,
  mergeLabelIds,
  buildDescription,
} from '../syncer.js';
import type { ScoredPR } from '../types.js';

describe('matchPRNumber', () => {
  it('extracts PR number from Linear issue title', () => {
    expect(matchPRNumber('PR #25123: Fix drag-and-drop')).toBe(25123);
  });
  it('returns null for non-matching title', () => {
    expect(matchPRNumber('Some random issue')).toBeNull();
  });
});

describe('mapPriorityToLinear', () => {
  it('maps urgent to 1', () => expect(mapPriorityToLinear('urgent')).toBe(1));
  it('maps high to 2', () => expect(mapPriorityToLinear('high')).toBe(2));
  it('maps normal to 3', () => expect(mapPriorityToLinear('normal')).toBe(3));
  it('maps low to 4', () => expect(mapPriorityToLinear('low')).toBe(4));
});

describe('mapLabelsToLinear', () => {
  it('maps pr: fix to Bug label ID', () => {
    const ids = mapLabelsToLinear(['pr: fix', 'source: core:admin']);
    expect(ids).toContain('a850ce54-33cd-4917-a06a-4d2df6dafab2');
    expect(ids).toHaveLength(1);
  });
  it('returns empty for unmapped labels', () => {
    expect(mapLabelsToLinear(['some-random-label'])).toEqual([]);
  });
});

describe('buildLabelIds', () => {
  it('includes PR type, priority, complexity, CI, and quick win labels', () => {
    const ids = buildLabelIds({
      pr: {
        number: 123,
        title: 'test',
        author: 'contributor',
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
      },
      linkedIssues: [],
      value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 30 },
      complexity: 'low',
      priority: 'urgent',
      area: 'admin',
      areaTier: 'medium',
      prType: 'fix',
      isQuickWin: true,
    } as ScoredPR);
    // PR type: Bug
    expect(ids).toContain('a850ce54-33cd-4917-a06a-4d2df6dafab2');
    // Priority: Urgent
    expect(ids).toContain('97df26d2-ff52-4316-8f5b-1e3cfdda5953');
    // Complexity: Low
    expect(ids).toContain('97a5f309-56f9-43e2-b167-c89eb90bf1ec');
    // CI: Passing
    expect(ids).toContain('a9f94fde-ac2d-4e67-8a57-2271ae9172cb');
    // Quick Win
    expect(ids).toContain('24eb891f-061f-4d38-8f13-6a9e89f5a983');
    // Source: admin
    expect(ids).toContain('334b6c23-7d07-484a-94a9-97cf42f8dca1');
    expect(ids).toHaveLength(6);
  });

  it('omits quick win label when not a quick win', () => {
    const ids = buildLabelIds({
      pr: {
        number: 456,
        title: 'test',
        author: 'user',
        body: '',
        labels: ['pr: enhancement'],
        additions: 500,
        deletions: 100,
        changedFiles: 15,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-15T00:00:00Z',
        state: 'open',
        isDraft: false,
        mergedAt: null,
        closedAt: null,
        ciStatus: 'failing',
        files: [],
      },
      linkedIssues: [],
      value: { base: 20, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 20 },
      complexity: 'high',
      priority: 'low',
      area: 'admin',
      areaTier: 'medium',
      prType: 'enhancement',
      isQuickWin: false,
    } as ScoredPR);
    // Should NOT contain quick win
    expect(ids).not.toContain('24eb891f-061f-4d38-8f13-6a9e89f5a983');
    // Source: admin
    expect(ids).toContain('334b6c23-7d07-484a-94a9-97cf42f8dca1');
    expect(ids).toHaveLength(5);
  });

  it('includes Has Linked Issue label when linkedIssues is non-empty', () => {
    const ids = buildLabelIds({
      pr: {
        number: 789,
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
      },
      linkedIssues: [
        {
          issue: { number: 100, title: 'bug', labels: [], thumbsUp: 0, comments: 0, state: 'open' },
          severity: 'none',
          status: 'none',
        },
      ],
      value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 30 },
      complexity: 'low',
      priority: 'normal',
      area: 'admin',
      areaTier: 'medium',
      prType: 'fix',
      isQuickWin: false,
    } as ScoredPR);
    // Has Linked Issue
    expect(ids).toContain('9d9d30d6-d201-40f1-bf65-1b51d43f95e5');
  });
});

describe('mergeLabelIds', () => {
  it('preserves manually-added labels and replaces managed ones', () => {
    const manualLabelId = 'manual-label-id-123';
    const oldManagedId = '97df26d2-ff52-4316-8f5b-1e3cfdda5953'; // priority: urgent
    const newManagedId = 'a912f8bf-60bc-4f07-9cef-4cf46e50e45b'; // priority: high

    const result = mergeLabelIds([oldManagedId, manualLabelId], [newManagedId]);
    expect(result).toContain(manualLabelId);
    expect(result).toContain(newManagedId);
    expect(result).not.toContain(oldManagedId);
  });

  it('returns only new managed labels when no manual labels exist', () => {
    const managedId = '97a5f309-56f9-43e2-b167-c89eb90bf1ec'; // complexity: low
    const result = mergeLabelIds([managedId], ['a912f8bf-60bc-4f07-9cef-4cf46e50e45b']);
    expect(result).toEqual(['a912f8bf-60bc-4f07-9cef-4cf46e50e45b']);
  });

  it('deduplicates label IDs', () => {
    const manualId = 'manual-123';
    const result = mergeLabelIds([manualId], [manualId]);
    expect(result).toHaveLength(1);
  });
});

describe('buildDescription', () => {
  it('includes PR link, author, and quick win status', () => {
    const desc = buildDescription({
      pr: {
        number: 123,
        title: 'test',
        author: 'contributor',
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
      },
      linkedIssues: [],
      value: { base: 30, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 30 },
      complexity: 'low',
      priority: 'low',
      area: 'admin',
      areaTier: 'medium',
      prType: 'fix',
      isQuickWin: true,
    } as ScoredPR);
    expect(desc).toContain('👤 **Author**: @contributor');
    expect(desc).toContain('github.com/strapi/strapi/pull/123');
    expect(desc).toContain('Quick Win: ⚡ Yes');
    expect(desc).toContain('💬 **Last interaction**: 2026-02-15');
  });

  it('includes PR body in description when present', () => {
    const desc = buildDescription({
      pr: {
        number: 456,
        title: 'Add feature',
        author: 'dev',
        body: 'This PR adds a great feature.',
        labels: [],
        additions: 20,
        deletions: 5,
        changedFiles: 2,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-15T00:00:00Z',
        state: 'open',
        isDraft: false,
        mergedAt: null,
        closedAt: null,
        ciStatus: 'passing',
        files: [],
      },
      linkedIssues: [],
      value: { base: 20, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 20 },
      complexity: 'low',
      priority: 'normal',
      area: 'admin',
      areaTier: 'medium',
      prType: 'feature',
      isQuickWin: false,
    } as ScoredPR);
    expect(desc).toContain('### 📝 PR Description');
    expect(desc).toContain('This PR adds a great feature.');
  });

  it('truncates long PR body to 2000 chars', () => {
    const longBody = 'x'.repeat(3000);
    const desc = buildDescription({
      pr: {
        number: 789,
        title: 'Big PR',
        author: 'dev',
        body: longBody,
        labels: [],
        additions: 100,
        deletions: 50,
        changedFiles: 5,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-15T00:00:00Z',
        state: 'open',
        isDraft: false,
        mergedAt: null,
        closedAt: null,
        ciStatus: 'passing',
        files: [],
      },
      linkedIssues: [],
      value: { base: 20, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 20 },
      complexity: 'medium',
      priority: 'normal',
      area: 'admin',
      areaTier: 'medium',
      prType: 'feature',
      isQuickWin: false,
    } as ScoredPR);
    expect(desc).toContain('### 📝 PR Description');
    expect(desc).toContain('…');
    // The truncated body should be 2000 chars + ellipsis
    const bodySection = desc.split('### 📝 PR Description\n')[1].split('\n\n[')[0];
    expect(bodySection.length).toBeLessThanOrEqual(2002); // 2000 + ellipsis char
  });

  it('omits PR description section when body is empty', () => {
    const desc = buildDescription({
      pr: {
        number: 101,
        title: 'test',
        author: 'dev',
        body: '',
        labels: [],
        additions: 5,
        deletions: 2,
        changedFiles: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-15T00:00:00Z',
        state: 'open',
        isDraft: false,
        mergedAt: null,
        closedAt: null,
        ciStatus: 'passing',
        files: [],
      },
      linkedIssues: [],
      value: { base: 10, severity: 0, status: 0, engagement: 0, urgency: 1.0, total: 10 },
      complexity: 'low',
      priority: 'low',
      area: 'unknown',
      areaTier: 'medium',
      prType: 'unknown',
      isQuickWin: false,
    } as ScoredPR);
    expect(desc).not.toContain('### 📝 PR Description');
  });
});
