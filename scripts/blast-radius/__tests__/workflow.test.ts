import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const workflowPath = join(process.cwd(), '.github/workflows/blast-radius.yml');

test('the advisory workflow checks out the PR merge ref and only transports v2 output', async () => {
  await assert.rejects(readFile(join(process.cwd(), '.github/workflows/pr-blast-radius.yml')));
  const workflow = await readFile(workflowPath, 'utf8');
  assert.match(
    workflow,
    /^on:\n  pull_request:\n    types: \[opened, synchronize, reopened, ready_for_review\]$/m
  );
  assert.doesNotMatch(
    workflow,
    /closed|pull_request_target|pull-requests:\s*read|\bGH_TOKEN\b|github\.token|upload-artifact|\bgh\b/
  );
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(workflow, /uses: actions\/checkout@[a-f0-9]{40}/);
  assert.match(workflow, /group: blast-radius-\$\{\{ github\.event\.number \}\}/);
  assert.match(workflow, /ref: refs\/pull\/\$\{\{ github\.event\.number \}\}\/merge/);
  assert.match(workflow, /fetch-depth: 2/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /yarn tsx scripts\/blast-radius\/index\.ts --json/);
  assert.match(workflow, /yarn tsx scripts\/blast-radius\/summary\.ts/);
  assert.match(workflow, /schemaVersion[\s\S]*2/);
  assert.match(workflow, /classifierVersion[\s\S]*2/);
  assert.match(workflow, /advisory/i);
  assert.doesNotMatch(workflow, /NON_RUNTIME|SINGLE_PACKAGE|MULTI_PACKAGE|\bWIDE\b|\bREPOSITORY\b/);
});
