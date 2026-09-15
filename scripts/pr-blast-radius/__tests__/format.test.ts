import assert from 'node:assert/strict';
import test from 'node:test';
import { createResult, renderHuman, renderJson, renderMarkdown } from '../format';
test('renders stable JSON only', () => {
  const text = renderJson({
    schemaVersion: 2,
    classifierVersion: 2,
    repository: 'strapi/strapi',
    radius: 'LOCAL',
  });
  assert.equal(
    text,
    '{"schemaVersion":2,"classifierVersion":2,"repository":"strapi/strapi","radius":"LOCAL"}\n'
  );
});

test('version-1 output without runtime provenance', () => {
  const result = createResult({
    snapshot: {
      number: 2,
      state: 'closed',
      merged: true,
      base: { branch: 'develop', sha: 'A'.repeat(40) },
      head: { sha: 'B'.repeat(40) },
      additions: 3,
      deletions: 1,
      changedFiles: 2,
      files: [
        { path: 'z.ts', status: 'modified' },
        { path: 'a.ts', previousPath: 'old.ts', status: 'renamed' },
      ],
    },
    workspaceRevision: 'C'.repeat(40),
    radius: 'LOCAL',
    reasons: ['z', 'a'],
    affectedProjects: ['z', 'a', 'a'],
    totalProjects: 8,
    sensitivitySignals: ['permissions', 'authentication'],
  });
  assert.deepEqual(Object.keys(result), [
    'schemaVersion',
    'classifierVersion',
    'repository',
    'pullRequest',
    'prRevision',
    'workspaceRevision',
    'radius',
    'radiusDefinition',
    'changedFiles',
    'additions',
    'deletions',
    'affectedProjectCount',
    'totalProjectCount',
    'affectedProjects',
    'sensitivitySignals',
    'reasons',
    'warnings',
  ]);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.classifierVersion, 1);
  assert.equal('reachProvenance' in result, false);
  assert.deepEqual(result.affectedProjects, ['a', 'z']);
  assert.deepEqual(
    result.changedFiles.map((file) => file.path),
    ['a.ts', 'z.ts']
  );
  assert.equal(
    renderJson(result),
    renderJson(
      createResult({
        snapshot: {
          ...result.pullRequest,
          base: result.pullRequest.base,
          head: result.pullRequest.head,
          additions: 3,
          deletions: 1,
          changedFiles: 2,
          files: result.changedFiles,
        },
        workspaceRevision: result.workspaceRevision,
        radius: result.radius,
        reasons: ['a', 'z'],
        affectedProjects: ['a', 'z'],
        totalProjects: 8,
        sensitivitySignals: ['authentication', 'permissions'],
      })
    )
  );
  assert.equal(
    renderHuman(result),
    `PR strapi/strapi#2 — LOCAL\n\n2 of 8 projects affected\n2 files changed · +3 / -1\n\nAffected projects\n- a\n- z\n\nSensitivity signals\n- Authentication\n- Permissions\n\nWhy this tier\n- a\n- z\n\nAnalysis basis\n- GitHub PR revision: bbbbbbb\n- Current checkout Nx graph: ccccccc\n- Note: Uncommitted local graph-configuration changes are not represented by this hash.\n\nClassifier version: 1\n`
  );
  assert.doesNotMatch(renderJson(result), /reachProvenance|Document Service runtime reach/);
  assert.doesNotMatch(renderHuman(result), /Runtime contracts|Document Service runtime reach/);
  assert.deepEqual(result.warnings, [
    "PR metadata and changed paths come from GitHub at bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb; affected projects come from the current checkout's Nx graph at cccccccccccccccccccccccccccccccccccccccc.",
    'Workspace revision identifies the checked-out commit; uncommitted local graph-configuration changes, if any, are not represented by that hash.',
  ]);
});

test('renders deterministic injection-safe Markdown with readable labels', () => {
  const result = createResult({
    snapshot: {
      number: 3,
      state: 'open',
      merged: false,
      base: { branch: 'develop', sha: 'a'.repeat(40) },
      head: { sha: 'b'.repeat(40) },
      additions: 1,
      deletions: 0,
      changedFiles: 1,
      files: [{ path: 'safe.ts', status: 'modified' }],
    },
    workspaceRevision: 'c'.repeat(40),
    radius: 'LOCAL',
    reasons: ['Why `this` <matters>'],
    affectedProjects: ['<script>\n```\u0085\u202e\u2028\u2029', 'plain-project'],
    totalProjects: 2,
    sensitivitySignals: ['shared-test-infrastructure', 'future_signal'],
  });

  const markdown = renderMarkdown(result);
  assert.equal(markdown, renderMarkdown(result));
  assert.match(markdown, /^## PR strapi\/strapi#3 — LOCAL\n\n> Advisory only:/);
  assert.match(markdown, /2 of 2 projects affected\n1 file changed · \+1 \/ -0/);
  assert.match(markdown, /- &lt;script&gt;\\u000a&#96;&#96;&#96;/);
  assert.match(markdown, /\\u0085\\u202e\\u2028\\u2029/);
  assert.match(markdown, /- plain\\-project/);
  assert.match(markdown, /- Shared test infrastructure/);
  assert.match(markdown, /- Future Signal/);
  assert.match(markdown, /Why this tier\n\n- Why &#96;this&#96; &lt;matters&gt;/);
  assert.match(markdown, /Uncommitted local graph\\-configuration changes are not represented/);
  assert.match(markdown, /Classifier version: 1/);
  assert.doesNotMatch(markdown, /<script>|\n```|\u0085|\u202e|\u2028|\u2029/);
});

test('uses None for empty human and Markdown lists', () => {
  const result = createResult({
    snapshot: {
      number: 4,
      state: 'open',
      merged: false,
      base: { branch: 'develop', sha: 'a'.repeat(40) },
      head: { sha: 'b'.repeat(40) },
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      files: [],
    },
    workspaceRevision: 'c'.repeat(40),
    radius: 'NON_RUNTIME',
    reasons: [],
    affectedProjects: [],
    totalProjects: 2,
    sensitivitySignals: [],
  });

  assert.match(
    renderHuman(result),
    /Affected projects\n- None\n\nSensitivity signals\n- None\n\nWhy this tier\n- None/
  );
  assert.match(
    renderMarkdown(result),
    /Affected projects\n\n- None\n\nSensitivity signals\n\n- None\n\nWhy this tier\n\n- None/
  );
});

test('uses code-point changed-file ordering independent of input permutation', () => {
  const input = (changedFiles: Array<{ path: string; status: 'modified' }>) =>
    createResult({
      snapshot: {
        number: 1,
        state: 'open',
        merged: false,
        base: { branch: 'develop', sha: 'a'.repeat(40) },
        head: { sha: 'b'.repeat(40) },
        additions: 0,
        deletions: 0,
        changedFiles: changedFiles.length,
        files: changedFiles,
      },
      workspaceRevision: 'c'.repeat(40),
      radius: 'NON_RUNTIME',
      reasons: [],
      affectedProjects: [],
      totalProjects: 2,
      sensitivitySignals: [],
    });
  const first = input([
    { path: 'ä.ts', status: 'modified' },
    { path: 'z.ts', status: 'modified' },
  ]);
  const second = input([
    { path: 'z.ts', status: 'modified' },
    { path: 'ä.ts', status: 'modified' },
  ]);
  assert.deepEqual(
    first.changedFiles.map((file) => file.path),
    ['z.ts', 'ä.ts']
  );
  assert.equal(renderJson(first), renderJson(second));
});
