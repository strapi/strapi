import assert from 'node:assert/strict';
import test from 'node:test';
import { analysisPaths, globalCategories, isNonRuntimePath, sensitivitySignals } from '../paths';
test('expands rename paths and matches global and non-runtime categories without near misses', () => {
  assert.deepEqual(analysisPaths([{ path: 'new.ts', previousPath: 'old.ts', status: 'renamed' }]), [
    'new.ts',
    'old.ts',
  ]);
  for (const path of [
    'package.json',
    'yarn.lock',
    '.yarn/cache/a',
    '.github/workflows/a.yml',
    '.github/actions/run-build/a',
    'packages/core/package.json',
  ])
    assert.notEqual(globalCategories(path).length, 0);
  assert.equal(globalCategories('package-lock.json').length, 0);
  for (const path of [
    'docs/a.md',
    'tests/a.ts',
    'scripts/a.ts',
    'examples/a.ts',
    '.github/ISSUE_TEMPLATE/a.md',
  ])
    assert.equal(isNonRuntimePath(path), true);
  assert.equal(isNonRuntimePath('packages/core/src/a.ts'), false);
});
test('emits each sensitivity signal exactly once from exact path evidence', () => {
  assert.deepEqual(
    sensitivitySignals([
      'packages/plugins/users-permissions/auth.ts',
      'packages/core/permissions/rbac.ts',
      'tests/migration/a.ts',
      'packages/core/database/a.sql',
      'packages/core/types/a.ts',
      '.changeset/a',
      '.github/actions/run-api-tests/a',
      '.github/workflows/release.yml',
    ]),
    [
      'authentication',
      'database-persistence',
      'migrations',
      'permissions',
      'public-types',
      'release-tooling',
      'shared-test-infrastructure',
      'workflow-changes',
    ]
  );
  assert.deepEqual(sensitivitySignals(['authorization-code.ts']), []);
});

test('limits examples complex migration evidence to the approved fixture surface', () => {
  assert.deepEqual(sensitivitySignals(['examples/complex/README.md']), []);
  assert.deepEqual(
    sensitivitySignals([
      'examples/complex/config/database.ts',
      'examples/complex/scripts/seed-v4.ts',
      'examples/complex/src/index.ts',
      'examples/complex/package.json',
      'examples/complex/docker-compose.dev.yml',
    ]),
    ['database-persistence', 'migrations']
  );
});
