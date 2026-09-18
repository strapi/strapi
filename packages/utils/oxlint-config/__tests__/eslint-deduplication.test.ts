import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const contentManagerRoot = join(repositoryRoot, 'packages/core/content-manager');

const { backJavaScript, backTypeScript, frontJavaScript, frontTypeScript } =
  require('../../eslint-config-custom/oxlint.js') as {
    backJavaScript: string[];
    backTypeScript: string[];
    frontJavaScript: string[];
    frontTypeScript: string[];
  };

type Surface = 'back-js' | 'back-ts' | 'front-js' | 'front-ts';
type Fixture = { source: string; surface?: Surface; companion?: string };

const fixtures = {
  'constructor-super': {
    source: 'class Example extends Parent { constructor() {} }',
  },
  'for-direction': { source: 'for (let index = 0; index < 10; index -= 1) {}' },
  'getter-return': { source: 'const object = { get value() {} };' },
  'import/default': {
    source: "import value from './eslintDeduplicationModule';\nvoid value;",
    surface: 'front-ts',
    companion: 'export const value = 1;',
  },
  'import/namespace': {
    source: "import * as values from './eslintDeduplicationModule';\nvoid values.missing;",
    surface: 'front-ts',
    companion: 'export const value = 1;',
  },
  'no-async-promise-executor': {
    source: 'new Promise(async (resolvePromise) => resolvePromise());',
  },
  'no-caller': { source: 'function example() { return arguments.caller; }\nexample();' },
  'no-class-assign': { source: 'class Example {}\nExample = 1;' },
  'no-compare-neg-zero': { source: 'if (value === -0) {}' },
  'no-const-assign': { source: 'const value = 1;\nvalue = 2;' },
  'no-constant-condition': { source: 'if (true) {}' },
  'no-control-regex': { source: String.raw`const pattern = /\x1f/;` },
  'no-debugger': { source: 'debugger;' },
  'no-delete-var': { source: 'var value;\ndelete value;' },
  'no-dupe-class-members': { source: 'class Example { value() {} value() {} }' },
  'no-dupe-else-if': { source: 'if (value === 1) {} else if (value === 1) {}' },
  'no-dupe-keys': { source: 'const object = { value: 1, value: 2 };' },
  'no-duplicate-case': {
    source: 'switch (value) { case 1: break; case 1: break; default: break; }',
  },
  'no-empty-character-class': { source: 'const pattern = /[]/;' },
  'no-empty-pattern': { source: 'const {} = value;' },
  'no-eval': { source: "eval('value');" },
  'no-ex-assign': { source: 'try {} catch (error) { error = new Error(); }' },
  'no-extra-boolean-cast': { source: 'if (!!value) {}' },
  'no-func-assign': { source: 'function example() {}\nexample = 1;' },
  'no-global-assign': { source: 'undefined = 1;' },
  'no-import-assign': {
    source: "import { value } from './eslintDeduplicationModule';\nvalue = 2;",
    surface: 'front-js',
    companion: 'export const value = 1;',
  },
  'no-invalid-regexp': { source: "const pattern = new RegExp('[');" },
  'no-irregular-whitespace': { source: 'const\u00a0value = 1;' },
  'no-iterator': { source: 'const iterator = object.__iterator__;' },
  'no-loss-of-precision': { source: 'const value = 9007199254740993;' },
  'no-misleading-character-class': { source: 'const pattern = /[👍]/;' },
  'no-nonoctal-decimal-escape': { source: String.raw`const value = '\8';` },
  'no-obj-calls': { source: 'Math();' },
  'no-self-assign': { source: 'value = value;' },
  'no-setter-return': { source: 'const object = { set value(next) { return next; } };' },
  'no-shadow-restricted-names': { source: 'function example(undefined) {}' },
  'no-sparse-arrays': { source: 'const values = [1,, 2];' },
  'no-this-before-super': {
    source: 'class Example extends Parent { constructor() { this.value = 1; super(); } }',
  },
  'no-unreachable': { source: 'function example() { return; example(); }' },
  'no-unsafe-finally': { source: 'function example() { try {} finally { return; } }' },
  'no-unsafe-negation': { source: 'if (!key in object) {}' },
  'no-unused-expressions': { source: 'value;' },
  'no-unused-labels': { source: 'unused: { value(); }' },
  'no-unused-vars': { source: 'const unused = 1;' },
  'no-useless-backreference': { source: 'const pattern = /\\1(a)/;' },
  'no-useless-catch': { source: 'try { value(); } catch (error) { throw error; }' },
  'no-useless-escape': { source: String.raw`const value = '\a';` },
  'no-useless-rename': { source: 'const { value: value } = object;' },
  'no-with': { source: 'with (object) { value(); }' },
  'require-yield': { source: 'function* example() { return 1; }' },
  'use-isnan': { source: 'if (value === NaN) {}' },
  '@typescript-eslint/no-duplicate-enum-values': {
    source: 'enum Values { First = 1, Second = 1 }',
    surface: 'back-ts',
  },
  '@typescript-eslint/no-extra-non-null-assertion': {
    source: 'const value = optionalValue!!;',
    surface: 'back-ts',
  },
  '@typescript-eslint/no-misused-new': {
    source: 'interface Example { new (): Example; }',
    surface: 'back-ts',
  },
  '@typescript-eslint/no-non-null-asserted-optional-chain': {
    source: 'const value = object?.value!;',
    surface: 'back-ts',
  },
  '@typescript-eslint/no-this-alias': {
    source: 'class Example { method() { const self = this; return self; } }',
    surface: 'back-ts',
  },
  '@typescript-eslint/no-unsafe-declaration-merging': {
    source: 'interface Example {}\nclass Example {}',
    surface: 'back-ts',
  },
  '@typescript-eslint/prefer-as-const': {
    source: "let value = 'value' as 'value';",
    surface: 'back-ts',
  },
  '@typescript-eslint/triple-slash-reference': {
    source: '/// <reference path="./eslintDeduplicationModule.ts" />',
    surface: 'back-ts',
    companion: 'export const value = 1;',
  },
  'react/jsx-key': {
    source: 'const nodes = [<div />];\nvoid nodes;',
    surface: 'front-ts',
  },
  'react/jsx-no-constructed-context-values': {
    source:
      "import React from 'react';\nconst Context = React.createContext({});\nfunction Example() { return <Context.Provider value={{ value: 1 }} />; }",
    surface: 'front-js',
  },
  'react/jsx-no-duplicate-props': {
    source: 'const node = <div title="first" title="second" />;',
    surface: 'front-ts',
  },
  'react/jsx-no-undef': { source: 'const node = <Missing />;', surface: 'front-ts' },
  'react/no-array-index-key': {
    source: 'const nodes = values.map((value, index) => <div key={index}>{value}</div>);',
    surface: 'front-js',
  },
  'react/no-children-prop': {
    source: 'const node = <div children="value" />;',
    surface: 'front-ts',
  },
  'react/no-danger-with-children': {
    source: 'const node = <div dangerouslySetInnerHTML={{ __html: value }}>child</div>;',
    surface: 'front-ts',
  },
  'react/no-direct-mutation-state': {
    source:
      "import React from 'react';\nclass Example extends React.Component { method() { this.state.value = 1; } render() { return null; } }",
    surface: 'front-ts',
  },
  'react/no-find-dom-node': {
    source: "import ReactDOM from 'react-dom';\nconst node = ReactDOM.findDOMNode(component);",
    surface: 'front-ts',
  },
  'react/no-is-mounted': {
    source: 'class Example { method() { return this.isMounted(); } }',
    surface: 'front-ts',
  },
  'react/no-render-return-value': {
    source: "import ReactDOM from 'react-dom';\nconst result = ReactDOM.render(<div />, element);",
    surface: 'front-ts',
  },
  'react/no-string-refs': {
    source: 'const node = <div ref="value" />;',
    surface: 'front-ts',
  },
  'react/no-this-in-sfc': {
    source: 'function Example() { return <div>{this.value}</div>; }',
    surface: 'front-js',
  },
  'react/no-will-update-set-state': {
    source:
      "import React from 'react';\nclass Example extends React.Component { componentWillUpdate() { this.setState({ value: 1 }); } render() { return null; } }",
    surface: 'front-js',
  },
  'react/void-dom-elements-no-children': {
    source: 'const node = <img>child</img>;',
    surface: 'front-js',
  },
} satisfies Record<string, Fixture>;

const optionHoldouts = {
  'no-cond-assign': 'let value;\nconst next = 1;\nif ((value = next)) {}',
  'no-unsafe-optional-chaining': 'const result = object?.value + 1;',
  'valid-typeof': 'const matches = typeof value === kind;',
  'react/jsx-no-duplicate-props': 'const node = <div value="first" VALUE="second" />;',
} as const;

type LintMessage = { ruleId: string | null; severity: number };
type EslintResult = { filePath: string; messages: LintMessage[] };
type OxlintDiagnostic = { code: string; severity: string; filename?: string };
type OxlintResult = { diagnostics: OxlintDiagnostic[]; number_of_files: number };

const run = (command: string, args: string[], environment: NodeJS.ProcessEnv = {}) => {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });

  assert.notEqual(result.status, null, result.error?.message);
  return result;
};

const normalizeOxlintRule = (code: string) => {
  const match = /^(?<plugin>[^()]+)\((?<rule>[^()]+)\)$/.exec(code);
  if (match?.groups === undefined) {
    return code;
  }

  if (match.groups.plugin === 'eslint') {
    return match.groups.rule;
  }

  if (match.groups.plugin === 'typescript') {
    return `@typescript-eslint/${match.groups.rule}`;
  }

  return `${match.groups.plugin}/${match.groups.rule}`;
};

const parseEslint = (stdout: string) => JSON.parse(stdout) as EslintResult[];
const parseOxlint = (stdout: string) => JSON.parse(stdout) as OxlintResult;

test('the root lint pass delegates only proven duplicate rules to OxLint', async () => {
  const roots = {
    'back-js': await mkdtemp(join(contentManagerRoot, 'eslintDedupBackJavaScript-')),
    'back-ts': await mkdtemp(join(contentManagerRoot, 'server/src/eslintDedupBackTypeScript-')),
    'front-js': await mkdtemp(join(contentManagerRoot, 'admin/src/eslintDedupFrontJavaScript-')),
    'front-ts': await mkdtemp(join(contentManagerRoot, 'admin/src/eslintDedupFrontTypeScript-')),
  } satisfies Record<Surface, string>;

  try {
    const expectedProfiles = {
      'back-js': backJavaScript,
      'back-ts': backTypeScript,
      'front-js': frontJavaScript,
      'front-ts': frontTypeScript,
    } satisfies Record<Surface, string[]>;

    assert.deepEqual(
      Object.fromEntries(
        Object.entries(expectedProfiles).map(([surface, rules]) => [surface, rules.length])
      ),
      { 'back-js': 51, 'back-ts': 43, 'front-js': 63, 'front-ts': 20 }
    );

    const fullyDeduplicated = new Set([
      ...backJavaScript,
      ...backTypeScript,
      ...frontJavaScript,
      ...frontTypeScript,
    ]);
    fullyDeduplicated.delete('react/jsx-no-duplicate-props');
    assert.equal(fullyDeduplicated.size, 73);
    assert.deepEqual(
      new Set(Object.keys(fixtures)),
      new Set([...fullyDeduplicated, 'react/jsx-no-duplicate-props'])
    );

    const primaryFiles = new Map<string, string>();
    let fixtureIndex = 0;

    for (const [rule, fixture] of Object.entries(fixtures)) {
      fixtureIndex += 1;
      const surface = fixture.surface ?? 'back-js';
      const extension =
        surface === 'back-js'
          ? 'js'
          : surface === 'front-js'
            ? 'jsx'
            : surface === 'back-ts'
              ? 'ts'
              : 'tsx';
      const basename = surface.startsWith('front')
        ? `EslintDeduplication${fixtureIndex}.${extension}`
        : `eslintDeduplication${fixtureIndex}.${extension}`;
      const file = join(roots[surface], basename);
      await writeFile(file, `${fixture.source}\n`);
      primaryFiles.set(rule, file);

      if (fixture.companion !== undefined) {
        await writeFile(
          join(roots[surface], 'eslintDeduplicationModule.ts'),
          `${fixture.companion}\n`
        );
        await writeFile(
          join(roots[surface], 'eslintDeduplicationModule.js'),
          `${fixture.companion}\n`
        );
      }
    }

    const relativeFiles = [...primaryFiles.values()].map((file) => relative(repositoryRoot, file));
    const eslintArgs = [
      join(repositoryRoot, 'node_modules/eslint/bin/eslint.js'),
      '--format=json',
      '--max-warnings=0',
      ...relativeFiles,
    ];
    const oxlintArgs = [
      '--config',
      'packages/utils/oxlint-config/oxlint.config.ts',
      '--format=json',
      ...relativeFiles,
    ];

    const authoritative = parseEslint(run(process.execPath, eslintArgs).stdout);
    const deduplicated = parseEslint(
      run(process.execPath, eslintArgs, { ESLINT_SKIP_OXLINT_RULES: 'true' }).stdout
    );
    const oxlint = parseOxlint(
      run(join(repositoryRoot, 'node_modules/oxlint/bin/oxlint'), oxlintArgs).stdout
    );

    const eslintMessages = new Map(
      authoritative.map((result) => [resolve(result.filePath), result.messages])
    );
    const deduplicatedMessages = new Map(
      deduplicated.map((result) => [resolve(result.filePath), result.messages])
    );
    const oxlintRules = new Set(
      oxlint.diagnostics.map((diagnostic) => normalizeOxlintRule(diagnostic.code))
    );

    const missingFromEslint = [];
    const retainedByDeduplicatedEslint = [];
    const missingFromOxlint = [];

    for (const [rule, file] of primaryFiles) {
      if (!eslintMessages.get(file)?.some((message) => message.ruleId === rule)) {
        missingFromEslint.push(rule);
      }
      if (deduplicatedMessages.get(file)?.some((message) => message.ruleId === rule)) {
        retainedByDeduplicatedEslint.push(rule);
      }
      if (!oxlintRules.has(rule)) {
        missingFromOxlint.push(rule);
      }
    }

    assert.deepEqual(missingFromEslint, [], 'rules missing from direct ESLint');
    assert.deepEqual(
      retainedByDeduplicatedEslint,
      [],
      'rules still reported by deduplicated ESLint'
    );
    assert.deepEqual(missingFromOxlint, [], 'rules missing from OxLint');

    const constructedContextFile = primaryFiles.get('react/jsx-no-constructed-context-values');
    assert.equal(
      eslintMessages
        .get(constructedContextFile ?? '')
        ?.find((message) => message.ruleId === 'react/jsx-no-constructed-context-values')?.severity,
      1
    );
    assert.equal(
      oxlint.diagnostics.find(
        (diagnostic) =>
          normalizeOxlintRule(diagnostic.code) === 'react/jsx-no-constructed-context-values'
      )?.severity,
      'error'
    );

    const holdoutFiles = new Map<string, string>();
    for (const [rule, source] of Object.entries(optionHoldouts)) {
      const surface = rule.startsWith('react/') ? 'front-js' : 'back-js';
      const extension = surface === 'front-js' ? 'jsx' : 'js';
      const basename =
        surface === 'front-js'
          ? `EslintHoldout.${extension}`
          : `eslintHoldout${rule.length}.${extension}`;
      const file = join(roots[surface], basename);
      await writeFile(file, `${source}\n`);
      holdoutFiles.set(rule, file);
    }

    const holdoutRelativeFiles = [...holdoutFiles.values()].map((file) =>
      relative(repositoryRoot, file)
    );
    const holdoutArgs = eslintArgs.slice(0, 3).concat(holdoutRelativeFiles);
    const holdoutAuthoritative = parseEslint(run(process.execPath, holdoutArgs).stdout);
    const holdoutDeduplicated = parseEslint(
      run(process.execPath, holdoutArgs, { ESLINT_SKIP_OXLINT_RULES: 'true' }).stdout
    );

    for (const [rule, file] of holdoutFiles) {
      for (const results of [holdoutAuthoritative, holdoutDeduplicated]) {
        assert.ok(
          results
            .find((result) => resolve(result.filePath) === file)
            ?.messages.some((message) => message.ruleId === rule),
          `ESLint did not retain ${rule}`
        );
      }
    }

    const permissionChecker = join(contentManagerRoot, 'server/src/services/permission-checker.ts');
    const backendOptionHoldouts = ['no-cond-assign', 'no-unsafe-optional-chaining'] as const;
    const configProbe = `
      const { ESLint } = require('eslint');
      const rules = require(${JSON.stringify(
        join(repositoryRoot, 'packages/utils/eslint-config-custom/oxlint.js')
      )}).backTypeScript;
      new ESLint({ cwd: ${JSON.stringify(join(contentManagerRoot, 'server'))} })
        .calculateConfigForFile(${JSON.stringify(permissionChecker)})
        .then((config) => console.log(JSON.stringify(Object.fromEntries(
          [...rules, ...${JSON.stringify(backendOptionHoldouts)}].map((rule) => [rule, config.rules[rule]])
        ))));
    `;
    const permissionRules = JSON.parse(
      run(process.execPath, ['-e', configProbe], { ESLINT_SKIP_OXLINT_RULES: 'true' }).stdout
    ) as Record<string, unknown>;

    assert.ok(
      backTypeScript.every((rule) => {
        const setting = permissionRules[rule];
        return Array.isArray(setting) && (setting[0] === 'off' || setting[0] === 0);
      }),
      'delegated backend TypeScript rules were not disabled for permission-checker.ts'
    );
    assert.ok(
      backendOptionHoldouts.every((rule) => {
        const setting = permissionRules[rule];
        if (!Array.isArray(setting)) {
          return false;
        }

        const severity = setting[0];
        return (
          severity === 'error' ||
          severity === 'warn' ||
          (typeof severity === 'number' && severity > 0)
        );
      }),
      'option-sensitive backend rules did not remain enabled for permission-checker.ts'
    );

    const permissionOxlint = parseOxlint(
      run(join(repositoryRoot, 'node_modules/oxlint/bin/oxlint'), [
        '--config',
        'packages/utils/oxlint-config/oxlint.config.ts',
        '--format=json',
        '--no-error-on-unmatched-pattern',
        relative(repositoryRoot, permissionChecker),
      ]).stdout
    );
    assert.equal(permissionOxlint.number_of_files, 1);

    const lintStagedModule = await import(
      pathToFileURL(join(repositoryRoot, 'lint-staged.shared.mjs')).href
    );
    const lintStaged = lintStagedModule.default as Record<
      string,
      (files: string[]) => Promise<string[]>
    >;
    const lintStagedCommands = await lintStaged['*.{js,ts,jsx,tsx}']([
      primaryFiles.get('no-debugger') ?? '',
    ]);
    assert.match(lintStagedCommands[0], /^eslint --cache --fix --max-warnings=0 /);
    assert.match(lintStagedCommands[1], /^prettier --cache --write /);
    assert.ok(lintStagedCommands.every((command) => !command.includes('OxLint')));
    assert.ok(lintStagedCommands.every((command) => !command.includes('ESLINT_SKIP_OXLINT_RULES')));
  } finally {
    await Promise.all(
      Object.values(roots).map((root) => rm(root, { recursive: true, force: true }))
    );
  }
});
