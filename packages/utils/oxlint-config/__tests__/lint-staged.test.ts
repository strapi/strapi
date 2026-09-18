import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const contentManagerRoot = join(repositoryRoot, 'packages/core/content-manager');
const contentReleasesRoot = join(repositoryRoot, 'packages/core/content-releases');

const loadTask = async () => {
  const lintStagedModule = await import(
    `${pathToFileURL(join(repositoryRoot, 'lint-staged.shared.mjs')).href}?test=${Date.now()}`
  );

  const lintStaged = lintStagedModule.default as Record<
    string,
    (files: string[]) => Promise<string[]>
  >;

  return lintStaged['*.{js,ts,jsx,tsx}'];
};

const runCommand = (command: string, cwd = contentManagerRoot) => {
  const result = spawnSync(command, {
    cwd,
    encoding: 'utf8',
    env: process.env,
    shell: true,
  });

  assert.notEqual(result.status, null, result.error?.message);
  return result;
};

const assertCommandPasses = (command: string) => {
  const result = runCommand(command);
  assert.equal(result.status, 0, `${command}\n${result.stdout}\n${result.stderr}`);
};

test('lint-staged keeps package filtering and quotes every lintable path', async () => {
  const fixtureRoot = await mkdtemp(join(contentManagerRoot, 'lintStagedCommands-'));
  const distRoot = join(contentManagerRoot, 'dist');
  await mkdir(distRoot, { recursive: true });
  const ignoredRoot = await mkdtemp(join(distRoot, 'lintStagedCommands-'));

  try {
    const quotedFile = join(fixtureRoot, `clean 'single' "double" space.js`);
    const ignoredFile = join(ignoredRoot, 'ignored.js');
    await writeFile(
      quotedFile,
      "'use strict';\nmodule.exports = function identity(value) { return value; };\n"
    );
    await writeFile(ignoredFile, 'debugger;\n');

    const task = await loadTask();
    const commands = await task([quotedFile, ignoredFile]);

    assert.equal(commands.length, 3);
    assert.match(commands[0], /^oxlint --config .* --fix /);
    assert.match(commands[1], /^eslint --cache --fix --max-warnings=0 /);
    assert.match(commands[2], /^prettier --cache --write /);

    for (const command of commands.slice(0, 2)) {
      assert.ok(command.includes(`'${quotedFile.replaceAll("'", "'\\''")}'`));
      assert.ok(!command.includes(ignoredFile));
    }
    assert.ok(commands[2].includes(`'${ignoredFile}'`));

    for (const command of commands) {
      assertCommandPasses(command);
    }
  } finally {
    await Promise.all([
      rm(fixtureRoot, { recursive: true, force: true }),
      rm(ignoredRoot, { recursive: true, force: true }),
    ]);
  }
});

test('the custom content-releases task keeps its package-local command form', async () => {
  const lintStagedModule = await import(
    pathToFileURL(join(contentReleasesRoot, 'lint-staged.config.mjs')).href
  );
  const lintStaged = lintStagedModule.default as Record<string, string[]>;

  assert.deepEqual(lintStaged['*.{js,ts,jsx,tsx}'], [
    'yarn run -T oxlint --config ../../../packages/utils/oxlint-config/oxlint.config.ts --fix --no-error-on-unmatched-pattern',
    'yarn run -T eslint --cache --fix --max-warnings=0',
    'prettier --cache --write',
  ]);

  const fixtureRoot = await mkdtemp(join(contentReleasesRoot, 'lintStagedCommands-'));
  try {
    const cleanFile = join(fixtureRoot, 'clean.js');
    await writeFile(cleanFile, "'use strict';\nmodule.exports = {};\n");
    const oxlintCommand = `${lintStaged['*.{js,ts,jsx,tsx}'][0]} '${cleanFile}'`;
    const result = runCommand(oxlintCommand, contentReleasesRoot);
    assert.equal(result.status, 0, `${oxlintCommand}\n${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('lint-staged composes fixers and keeps both linters blocking', async () => {
  const fixtureRoot = await mkdtemp(join(contentManagerRoot, 'lintStagedBehavior-'));
  const frontRoot = await mkdtemp(join(contentManagerRoot, 'admin/src/LintStagedBehavior-'));

  try {
    const fixableFile = join(fixtureRoot, 'fixable.js');
    const unstagedFile = join(fixtureRoot, 'unstaged.js');
    const fixableSource = [
      "'use strict';",
      'function example(object) {',
      '  let result = 1;',
      '  const { value: value } = object;',
      '  return { result, value };',
      '}',
      'module.exports = example;',
      '',
    ].join('\n');
    await writeFile(fixableFile, fixableSource);
    await writeFile(unstagedFile, fixableSource);

    const task = await loadTask();
    const fixCommands = await task([fixableFile]);

    assertCommandPasses(fixCommands[0]);
    const afterOxlint = await readFile(fixableFile, 'utf8');
    assert.ok(!afterOxlint.includes('value: value'));
    assert.ok(afterOxlint.includes('let result'));

    assertCommandPasses(fixCommands[1]);
    const afterEslint = await readFile(fixableFile, 'utf8');
    assert.ok(afterEslint.includes('const result'));

    assertCommandPasses(fixCommands[2]);
    assert.equal(await readFile(unstagedFile, 'utf8'), fixableSource);

    const warningFile = join(frontRoot, 'Warning.tsx');
    await writeFile(warningFile, 'export const stringify = (value: any) => String(value);\n');
    const warningCommands = await task([warningFile]);
    assert.equal(runCommand(warningCommands[0]).status, 0, 'OxLint rejected the ESLint fixture');
    assert.notEqual(runCommand(warningCommands[1]).status, 0, 'ESLint warning did not block');

    const oxlintFailureFile = join(frontRoot, 'OxlintFailure.tsx');
    await writeFile(
      oxlintFailureFile,
      [
        "import type { ReactNode } from 'react';",
        'type Props = { children?: ReactNode };',
        'export const Example = ({ children = <span /> }: Props) => <div>{children}</div>;',
        '',
      ].join('\n')
    );
    const oxlintFailureCommands = await task([oxlintFailureFile]);
    assert.notEqual(runCommand(oxlintFailureCommands[0]).status, 0, 'OxLint error did not block');
  } finally {
    await Promise.all([
      rm(fixtureRoot, { recursive: true, force: true }),
      rm(frontRoot, { recursive: true, force: true }),
    ]);
  }
});
