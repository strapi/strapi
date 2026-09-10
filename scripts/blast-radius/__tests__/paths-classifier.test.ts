import assert from 'node:assert/strict';
import test from 'node:test';
import { classify } from '../classifier';
import { analysisPaths, globalCategories, isNonRuntimePath, sensitivitySignals } from '../paths';

test('recognizes .github, tests, docs, scripts and test surfaces as non-runtime before Nx', () => {
  for (const path of [
    '.github/workflows/blast-radius.yml',
    '.github/actions/install/action.yml',
    'tests/api/a.ts',
    'docs/a.mdx',
    'scripts/blast-radius/index.ts',
    'packages/core/a/__tests__/x.ts',
    'packages/core/a/x.spec.ts',
    'packages/core/a/x.d.ts',
  ])
    assert.equal(isNonRuntimePath(path), true, path);
  assert.equal(isNonRuntimePath('packages/core/a/src/runtime.ts'), false);
  assert.deepEqual(globalCategories('.github/workflows/blast-radius.yml'), []);
  assert.notEqual(globalCategories('package.json').length, 0);
  assert.notEqual(globalCategories('yarn.lock').length, 0);
  assert.deepEqual(analysisPaths([{ path: 'new.ts', previousPath: 'old.ts', status: 'renamed' }]), [
    'new.ts',
    'old.ts',
  ]);
});

test('uses renamed tiers and preserves sensitivity independently of reach', () => {
  const tier = (affected: number, total = 46, global = false) =>
    classify({
      affectedProjects: Array.from({ length: affected }, (_, index) => `p${index}`),
      totalProjects: total,
      globalMatches: global ? [{ category: 'root-package-metadata', path: 'package.json' }] : [],
      allPathsRecognizedNonRuntime: true,
    }).radius;
  assert.equal(tier(0), 'NON_RUNTIME');
  assert.equal(tier(1), 'SINGLE_PACKAGE');
  assert.equal(tier(2), 'MULTI_PACKAGE');
  assert.equal(tier(5), 'MULTI_PACKAGE');
  assert.equal(tier(6), 'WIDE');
  assert.equal(tier(23), 'REPOSITORY');
  assert.equal(tier(0, 46, true), 'REPOSITORY');
  assert.equal(tier(1, 2), 'REPOSITORY');
  assert.deepEqual(sensitivitySignals(['.github/workflows/a.yml']), ['workflow-changes']);
  assert.equal(tier(0), 'NON_RUNTIME');
});
