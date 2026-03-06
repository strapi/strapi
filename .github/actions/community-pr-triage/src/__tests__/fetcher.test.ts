import { describe, it, expect } from 'vitest';
import {
  parseIssueRefs,
  isCommunityAuthor,
  parseCIStatus,
  extractArea,
  estimateAreaFromFiles,
} from '../fetcher.js';

describe('parseIssueRefs', () => {
  it('extracts #12345 references', () => {
    expect(parseIssueRefs('Fixes #23161 and relates to #20870')).toEqual([23161, 20870]);
  });

  it('extracts "fixes #123" / "closes #123" patterns', () => {
    expect(parseIssueRefs('fixes #12345\ncloses #67890')).toEqual([12345, 67890]);
  });

  it('extracts full GitHub issue URLs', () => {
    expect(parseIssueRefs('See https://github.com/strapi/strapi/issues/23161')).toEqual([23161]);
  });

  it('deduplicates', () => {
    expect(parseIssueRefs('Fixes #123. Related: #123')).toEqual([123]);
  });

  it('ignores very small numbers', () => {
    expect(parseIssueRefs('See #12')).toEqual([]);
  });

  it('returns empty for no refs', () => {
    expect(parseIssueRefs('No issues here')).toEqual([]);
  });
});

describe('isCommunityAuthor', () => {
  const internalAuthors = new Set(['butcherZ', 'markkaylor', 'nclsndr']);

  it('filters internal authors', () => {
    expect(isCommunityAuthor('butcherZ', internalAuthors)).toBe(false);
    expect(isCommunityAuthor('markkaylor', internalAuthors)).toBe(false);
  });

  it('filters bots', () => {
    expect(isCommunityAuthor('app/dependabot', internalAuthors)).toBe(false);
    expect(isCommunityAuthor('renovate[bot]', internalAuthors)).toBe(false);
  });

  it('allows community authors', () => {
    expect(isCommunityAuthor('someContributor', internalAuthors)).toBe(true);
  });
});

describe('parseCIStatus', () => {
  it('returns passing when all checks succeed', () => {
    const checks = [
      { status: 'COMPLETED', conclusion: 'SUCCESS' },
      { status: 'COMPLETED', conclusion: 'SUCCESS' },
    ];
    expect(parseCIStatus(checks)).toBe('passing');
  });

  it('returns failing when any check fails', () => {
    const checks = [
      { status: 'COMPLETED', conclusion: 'SUCCESS' },
      { status: 'COMPLETED', conclusion: 'FAILURE' },
    ];
    expect(parseCIStatus(checks)).toBe('failing');
  });

  it('returns pending when checks are in progress', () => {
    expect(parseCIStatus([{ status: 'IN_PROGRESS', conclusion: null }])).toBe('pending');
  });

  it('returns pending for empty checks', () => {
    expect(parseCIStatus([])).toBe('pending');
  });
});

describe('extractArea', () => {
  it('extracts area from source: label', () => {
    expect(extractArea(['source: core:content-manager', 'pr: fix'])).toBe('content-manager');
  });

  it('extracts area from plugin label', () => {
    expect(extractArea(['source: plugin:i18n'])).toBe('i18n');
  });

  it('extracts from source: dependencies', () => {
    expect(extractArea(['source: dependencies'])).toBe('dependencies');
  });

  it('returns unknown for no source label', () => {
    expect(extractArea(['pr: fix'])).toBe('unknown');
  });
});

describe('estimateAreaFromFiles', () => {
  it('extracts area from a single core package path', () => {
    expect(estimateAreaFromFiles(['packages/core/content-manager/src/index.ts'])).toBe(
      'content-manager'
    );
  });

  it('extracts area from a single plugin path', () => {
    expect(estimateAreaFromFiles(['packages/plugins/i18n/server/src/bootstrap.ts'])).toBe('i18n');
  });

  it('returns most frequent area when multiple same-area paths', () => {
    expect(
      estimateAreaFromFiles([
        'packages/core/admin/src/components/Foo.tsx',
        'packages/core/admin/src/components/Bar.tsx',
        'packages/core/content-manager/src/index.ts',
      ])
    ).toBe('admin');
  });

  it('returns most common area when mixed areas', () => {
    expect(
      estimateAreaFromFiles([
        'packages/core/admin/src/a.ts',
        'packages/plugins/i18n/src/b.ts',
        'packages/plugins/i18n/src/c.ts',
      ])
    ).toBe('i18n');
  });

  it('returns unknown for no matching paths', () => {
    expect(estimateAreaFromFiles(['README.md', '.github/workflows/ci.yml'])).toBe('unknown');
  });

  it('returns unknown for empty files array', () => {
    expect(estimateAreaFromFiles([])).toBe('unknown');
  });
});
