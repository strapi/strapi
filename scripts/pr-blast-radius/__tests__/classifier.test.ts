import assert from 'node:assert/strict';
import test from 'node:test';
import { classify } from '../classifier';
const c = (n: number, total = 46, global = false) =>
  classify({
    affectedProjects: Array.from({ length: n }, (_, i) => `p${i}`),
    totalProjects: total,
    globalMatches: global
      ? [{ category: 'workflow-definition', path: '.github/workflows/a.yml' }]
      : [],
    allPathsRecognizedNonRuntime: true,
  });
test('classifies tiers, boundaries and global precedence', () => {
  assert.equal(c(0).radius, 'NON_RUNTIME');
  assert.equal(c(1).radius, 'LOCAL');
  assert.equal(c(2).radius, 'FEATURE');
  assert.equal(c(5).radius, 'FEATURE');
  assert.equal(c(6).radius, 'WIDE');
  assert.equal(c(23).radius, 'REPOSITORY');
  assert.equal(c(0, 46, true).radius, 'REPOSITORY');
  assert.equal(c(1, 2).radius, 'REPOSITORY');
});

test('uses half thresholds for odd, even, and tiny workspaces independently of sensitivity', () => {
  assert.equal(c(6, 13).radius, 'WIDE');
  assert.equal(c(7, 13).radius, 'REPOSITORY');
  assert.equal(c(3, 6).radius, 'REPOSITORY');
  assert.equal(c(1, 1).radius, 'REPOSITORY');
  assert.equal(c(0, 1).radius, 'NON_RUNTIME');
  const withoutSignals = c(6, 13).radius;
  // Sensitivity is deliberately absent from the classifier input type, so it cannot alter reach.
  assert.equal(withoutSignals, 'WIDE');
});
