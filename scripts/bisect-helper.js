#!/usr/bin/env node
/**
 * Git Bisect Helper (Node)
 *
 * What it does
 * - Interactively prompts for:
 *   - Test command to run at each checkout (e.g. `yarn test:unit --selectProjects Strapi -- packages/core/strapi/__tests__/version.test.ts`)
 *   - Known GOOD ref and BAD ref (Enter to use current commit for either)
 *   - Setup mode between checkouts: none | build (`yarn build`) | setup (`yarn setup`)
 * - Generates a temporary bash runner that, on each checkout, runs the chosen setup then executes the test command
 * - Starts a `git bisect` session with your refs and runs `git bisect run <runner>`
 * - Leaves the repo in a bisected state. Run `git bisect reset` when finished.
 *
 * Requirements
 * - git, bash, Node.js, and yarn available on PATH
 *
 * Usage
 * - Make sure this file is executable: `chmod +x scripts/bisect-helper.js`
 * - Run: `./scripts/bisect-helper.js`
 * - Follow prompts. Press Enter on good/bad if you want to mark the current commit.
 *
 * Notes
 * - The test command is base64-encoded into the runner to avoid quoting issues.
 * - The runner is created in your system temp folder and its path is printed for reference.
 * - `git bisect run` expects the runner to exit 0 for GOOD and non-zero for BAD; your test command’s exit code is passed through.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const inquirer = require('inquirer');
const execa = require('execa');

const writeFile = promisify(fs.writeFile);
const chmod = promisify(fs.chmod);

const isDebug = Boolean(process.env.DEBUG);

async function printFinalBadCommitLine() {
  try {
    const [{ stdout: short }, { stdout: subject }] = await Promise.all([
      execa('git', ['rev-parse', '--short', 'HEAD']),
      execa('git', ['show', '-s', '--format=%s', 'HEAD']),
    ]);
    console.log(`\nFIRST_BAD_COMMIT: ${short} - ${subject}`);
  } catch {
    // ignore
  }
}

async function promptInputs() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'testCommand',
      message: 'Enter the test command to run at each step (e.g., yarn test:api tests/api/...):',
      validate(input) {
        return input && input.trim().length > 0 ? true : 'Test command is required';
      },
    },
    {
      type: 'input',
      name: 'goodRef',
      message: 'Enter the known GOOD commit or tag (leave blank to use current):',
      validate() {
        return true; // allow blank
      },
    },
    {
      type: 'input',
      name: 'badRef',
      message: 'Enter the known BAD commit or tag (leave blank to use current):',
      validate() {
        return true; // allow blank
      },
    },
    {
      type: 'list',
      name: 'setupMode',
      message: 'Choose setup to run between checkouts:',
      default: 'none',
      choices: [
        { name: 'none (do nothing)', value: 'none' },
        { name: "build (run 'yarn build')", value: 'build' },
        { name: "setup (run 'yarn setup')", value: 'setup' },
      ],
    },
  ]);

  return answers;
}

function createRunnerScriptContent({ testCommand, setupMode }) {
  const testCommandB64 = Buffer.from(testCommand, 'utf8').toString('base64');

  return `#!/usr/bin/env bash
set -euo pipefail

export CI=

TEST_COMMAND_B64='${testCommandB64}'
SETUP_MODE='${setupMode}'

# Ensure we run from the repo root (worktree) if available, otherwise stay in current dir
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
fi

if [[ -n "\${DEBUG:-}" ]]; then
  echo "[bisect-runner] Checkout: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "[bisect-runner] Setup mode: \${SETUP_MODE}"
fi
case "\${SETUP_MODE}" in
  build)
    yarn build
    ;;
  setup)
    yarn setup
    ;;
  none)
    ;; # no-op
esac

# Decode base64 in a cross-platform way (GNU/macOS). Fallback to openssl if needed.
decode_b64() {
  if command -v base64 >/dev/null 2>&1; then
    if base64 --help 2>&1 | grep -q -- "--decode"; then
      base64 --decode
    else
      base64 -D
    fi
  elif command -v openssl >/dev/null 2>&1; then
    openssl base64 -d
  else
    echo "No base64 decoder found on PATH" >&2
    exit 2
  fi
}

TEST_COMMAND=$(printf %s "\${TEST_COMMAND_B64}" | decode_b64)

if [[ -n "\${DEBUG:-}" ]]; then
  echo "[bisect-runner] Running test command: \n\${TEST_COMMAND}"
fi
# Use bash -lc so complex commands, pipes, and env assignments work
bash -lc "\${TEST_COMMAND}"
`;
}

async function createRunnerScript(params) {
  const content = createRunnerScriptContent(params);
  const runnerPath = path.join(
    os.tmpdir(),
    `git-bisect-runner.${Date.now()}.${Math.random().toString(36).slice(2)}.sh`
  );
  await writeFile(runnerPath, content, { encoding: 'utf8' });
  await chmod(runnerPath, 0o755);
  return runnerPath;
}

async function runBisect({ goodRef, badRef, runnerPath }) {
  // Reset any existing bisect session silently
  try {
    await execa('git', ['bisect', 'reset'], { stdio: 'ignore' });
  } catch {}

  await execa('git', ['bisect', 'start'], { stdio: 'inherit' });
  if (badRef && badRef.trim().length > 0) {
    await execa('git', ['bisect', 'bad', badRef.trim()], { stdio: 'inherit' });
  } else {
    await execa('git', ['bisect', 'bad'], { stdio: 'inherit' });
  }
  if (goodRef && goodRef.trim().length > 0) {
    await execa('git', ['bisect', 'good', goodRef.trim()], { stdio: 'inherit' });
  } else {
    await execa('git', ['bisect', 'good'], { stdio: 'inherit' });
  }

  try {
    await execa('git', ['bisect', 'run', runnerPath], { stdio: 'inherit' });
    if (isDebug) {
      console.log('\n[bisect-helper] git bisect run completed.');
      await printFinalBadCommitLine();
    }
  } catch (err) {
    if (isDebug) {
      console.error(
        `\n[bisect-helper] git bisect run exited with status ${err.exitCode ?? 'unknown'}. See output above for details.`
      );
      await printFinalBadCommitLine();
    }
  }

  if (isDebug) {
    console.log(
      '\n[bisect-helper] Note: Your repository is currently checked out at a commit in the bisect state.'
    );
    console.log(
      "[bisect-helper] Run 'git bisect reset' when you're done inspecting to return to your previous state."
    );
    console.log(`[bisect-helper] Runner kept at: ${runnerPath}`);
  }
}

async function main() {
  if (isDebug) console.log('[bisect-helper] Git Bisect Helper (Node)');
  const answers = await promptInputs();
  const runnerPath = await createRunnerScript({
    testCommand: answers.testCommand,
    setupMode: answers.setupMode,
  });
  if (isDebug) {
    console.log(`\n[bisect-helper] Generated runner script at: ${runnerPath}`);
    console.log('[bisect-helper] Starting git bisect session...');
  }

  await runBisect({ goodRef: answers.goodRef, badRef: answers.badRef, runnerPath });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
