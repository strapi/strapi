import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { join } from 'node:path';

const workflowPath = join(process.cwd(), '.github/workflows/pr-blast-radius.yml');
const checkout = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1';
const setupNode = 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020';

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runBlocks(workflow: string): string[] {
  return [...workflow.matchAll(/^        run: \|\n((?:          .*\n?)*)/gm)].map(
    (match) => match[1]
  );
}

function classifyJobHeader(workflow: string): string {
  const match = workflow.match(/^  classify:\n([\s\S]*?)(?=^    steps:)/m);

  assert.ok(match, 'the classify job header must end before its steps mapping');

  return `  classify:\n${match[1]}`;
}

function assertNoRunnerContextInJobHeader(header: string): void {
  assert.doesNotMatch(header, /\$\{\{\s*runner\.|runner\.temp/);
}

test('classify job header rejects runner context even with unrelated job environment keys', () => {
  const invalidHeader = `  classify:\n    env:\n      CI: true\n      RESULT_PATH: \${{ runner.temp }}/pr-blast-radius.json\n`;

  assert.throws(() => assertNoRunnerContextInJobHeader(invalidHeader));
});

test('advisory PR workflow has the approved read-only transport contract', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(
    workflow,
    /^on:\n  pull_request:\n    types: \[opened, synchronize, reopened, ready_for_review, closed\]$/m
  );
  assert.doesNotMatch(workflow, /^  pull_request_target:/m);
  assert.match(
    workflow,
    /^concurrency:\n  group: pr-blast-radius-\$\{\{ github\.event\.pull_request\.number \}\}\n  cancel-in-progress: true$/m
  );
  assert.match(workflow, /^permissions:\n  contents: read\n  pull-requests: read$/m);
  assert.doesNotMatch(workflow, /^\s+[\w-]+:\s*write\s*$/m);
  assert.match(workflow, /^name: PR blast radius \(advisory\)$/m);
  assert.match(
    workflow,
    /^  classify:\n    name: PR blast radius \(advisory\)\n    runs-on: ubuntu-latest\n    timeout-minutes: 15$/m
  );
  assertNoRunnerContextInJobHeader(classifyJobHeader(workflow));

  const uses = [...workflow.matchAll(/^\s+-?(?: name: .*\n\s+)?\s*uses: (.+)$/gm)].map((match) =>
    match[1].trim().replace(/\s+#.*$/, '')
  );
  assert.deepEqual(uses, [checkout, setupNode, './.github/actions/yarn-nm-install']);
  for (const action of uses.filter((value) => !value.startsWith('./'))) {
    assert.match(action, /@[a-f0-9]{40}$/);
  }
  assert.match(workflow, new RegExp(`${escape(checkout)} # v\\d+\\.\\d+\\.\\d+`));
  assert.match(workflow, new RegExp(`${escape(setupNode)} # v\\d+\\.\\d+\\.\\d+`));
  assert.doesNotMatch(
    workflow,
    /actions\/upload-artifact|name:\s*pr-blast-radius-pr-|if-no-files-found|retention-days/
  );
  const checkoutStep = workflow.match(
    new RegExp(`- uses: ${escape(checkout)}(?:[^\\n]*\\n|$)([\\s\\S]*?)(?=^      - |^$)`, 'm')
  );
  assert.ok(checkoutStep, 'the pinned checkout step must exist');
  assert.doesNotMatch(checkoutStep[0], /^\s+with:/m);
  assert.doesNotMatch(checkoutStep[0], /^\s+(?:repository|ref|fetch-depth|persist-credentials):/m);
  assert.match(
    workflow,
    new RegExp(
      `uses: ${escape(setupNode)}(?: # [^\\n]+)?\\n        with:\\n          node-version: 22`
    )
  );
  assert.doesNotMatch(workflow, /cache-prefix:\s*pr-blast-radius-trusted/);
  assert.doesNotMatch(
    workflow,
    /head\.sha|github\.ref|refs\/pull|merge ref|\bgit (?:checkout|fetch)\b/i
  );

  assert.match(
    workflow,
    /name: Classify pull request\n        shell: bash\n        env:\n          GH_TOKEN: \$\{\{ github\.token \}\}\n          PR_NUMBER: \$\{\{ github\.event\.pull_request\.number \}\}\n          RESULT_PATH: \$\{\{ runner\.temp \}\}\/pr-blast-radius\.json\n        run: \|\n          set -euo pipefail\n          yarn tsx scripts\/pr-blast-radius\/index\.ts "\$PR_NUMBER" --json > "\$RESULT_PATH"/
  );
  assert.equal((workflow.match(/yarn tsx scripts\/pr-blast-radius\/index\.ts/g) ?? []).length, 1);
  assert.doesNotMatch(workflow, /yarn pr:blast-radius/);

  assert.match(
    workflow,
    /name: Validate classifier JSON\n        shell: bash\n        env:\n          RESULT_PATH: \$\{\{ runner\.temp \}\}\/pr-blast-radius\.json\n        run: \|\n          node <<'NODE'[\s\S]*readFileSync\(process\.env\.RESULT_PATH, 'utf8'\)[\s\S]*output\.trim\(\)\.length === 0[\s\S]*JSON\.parse\(output\);[\s\S]*NODE/
  );
  assert.doesNotMatch(workflow, /continue-on-error|\bcatch\b|\|\|\s*true|if:\s*always\(\)/);
  assert.match(
    workflow,
    /name: Publish advisory job summary\n        shell: bash\n        env:\n          RESULT_PATH: \$\{\{ runner\.temp \}\}\/pr-blast-radius\.json\n        run: \|\n          set -euo pipefail\n          yarn tsx scripts\/pr-blast-radius\/summary\.ts "\$RESULT_PATH" \| tee -a "\$GITHUB_STEP_SUMMARY"\n          test -s "\$GITHUB_STEP_SUMMARY"/
  );
  assert.equal((workflow.match(/yarn tsx scripts\/pr-blast-radius\/summary\.ts/g) ?? []).length, 1);
  const summary = workflow.slice(workflow.indexOf('name: Publish advisory job summary'));
  assert.doesNotMatch(
    summary,
    /```|cat "\$RESULT_PATH"|sed 's\/\^\/    \/'|PR_NUMBER|RUN_ID|RUN_ATTEMPT/
  );

  for (const run of runBlocks(workflow)) {
    assert.doesNotMatch(run, /github\.event\.|github\.token/);
    assert.doesNotMatch(
      run,
      /\b(?:NON_RUNTIME|LOCAL|FEATURE|WIDE|REPOSITORY|UNKNOWN)\b|affectedProject|sensitivitySignals|gh api|yarn test/i
    );
  }
});
