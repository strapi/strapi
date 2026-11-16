import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  EE_ONLY_DOMAINS,
  MEDIA_LIBRARY_DOMAIN,
  selectRunnableDomains,
} from '../runners/e2e-domains';

const DOMAINS = [
  'admin',
  'content-manager',
  'content-releases',
  'media-library',
  'review-workflows',
];

describe('selectRunnableDomains', () => {
  test('a shared CE job skips the media library and the Enterprise-only domains', () => {
    const { runnable, skipped } = selectRunnableDomains(DOMAINS, { isCE: true });

    expect(runnable).toEqual(['admin', 'content-manager']);
    expect(skipped.map(({ domain }) => domain)).toEqual([
      'content-releases',
      'media-library',
      'review-workflows',
    ]);
  });

  test('a shared EE job only skips the media library', () => {
    const { runnable } = selectRunnableDomains(DOMAINS, { isCE: false });

    expect(runnable).toEqual(['admin', 'content-manager', 'content-releases', 'review-workflows']);
  });

  test.each(['current', 'legacy'])('a %s media library job runs the media library', (suite) => {
    const { runnable } = selectRunnableDomains(['media-library'], {
      isCE: true,
      mediaLibrarySuite: suite,
    });

    expect(runnable).toEqual(['media-library']);
  });
});

/**
 * The rules above are only safe while every spec in those domains gates itself the same way. A
 * spec that runs without the gate would be skipped by the runner and never run, so these fail
 * first.
 */
const E2E_TESTS = path.resolve(__dirname, '../../e2e/tests');

const specsOf = (domain: string) =>
  readdirSync(path.join(E2E_TESTS, domain), { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.spec.ts'))
    .map((file) => ({ file, source: readFileSync(path.join(E2E_TESTS, domain, file), 'utf8') }));

// A test or describe block at the top level of a spec runs whatever the gate says.
const UNGATED_BLOCK = /^test(\.describe)?(\.(only|serial|parallel))?\(/m;

describe('the gated domains', () => {
  test.each(specsOf(MEDIA_LIBRARY_DOMAIN))(
    'media-library/$file only runs with E2E_MEDIA_LIBRARY',
    ({ source }) => {
      expect(source).toContain('describeOnCondition(process.env.E2E_MEDIA_LIBRARY ===');
      expect(source).not.toMatch(UNGATED_BLOCK);
    }
  );

  test.each(
    EE_ONLY_DOMAINS.flatMap((domain) => specsOf(domain).map((spec) => ({ domain, ...spec })))
  )('$domain/$file only runs in the Enterprise Edition', ({ source }) => {
    expect(source).toContain("describeOnCondition(edition === 'EE')");
    expect(source).not.toMatch(UNGATED_BLOCK);
  });
});
