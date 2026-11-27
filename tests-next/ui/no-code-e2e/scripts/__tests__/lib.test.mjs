// @ts-check
// Run with: node --test tests-next/ui/no-code-e2e/scripts/__tests__/
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  checkChanges,
  globToRegExp,
  hashScenario,
  lintScenario,
  loadConfig,
  parseScenario,
  parseUnifiedDiff,
  readSpecHeader,
  withSpecHeader,
} from '../lib.mjs';

const config = loadConfig();
const FILE = 'tests-next/ui/scenarios/content-manager/create-article.md';

const VALID = `---
id: cm-create-article
feature: content-manager
tier: critical   # comment
edition: CE
---

# Créer un article

## Préconditions

Je suis connecté en tant qu'éditeur.

## Étapes

1. Aller dans le Content Manager.
2. Créer une entrée.

## Résultats attendus

- Une notification de succès s'affiche.
`;

describe('parseScenario', () => {
  test('reads the front-matter, title, sections and target spec', () => {
    const scenario = parseScenario(FILE, VALID, config);
    assert.deepEqual(scenario.meta, {
      id: 'cm-create-article',
      feature: 'content-manager',
      tier: 'critical',
      edition: 'CE',
    });
    assert.equal(scenario.title, 'Créer un article');
    assert.equal(scenario.rel, 'content-manager/create-article');
    assert.equal(
      scenario.spec,
      'tests-next/ui/tests/generated/content-manager/create-article.ui-test.ts'
    );
    assert.match(scenario.sections.steps ?? '', /^1\. Aller/);
    assert.deepEqual(scenario.unknownSections, []);
  });

  test('accepts English section titles and CRLF line endings', () => {
    const english = VALID.replace('Préconditions', 'Preconditions')
      .replace('Étapes', 'Steps')
      .replace('Résultats attendus', 'Expected results')
      .replace(/\n/g, '\r\n');
    const scenario = parseScenario(FILE, english, config);
    assert.deepEqual(lintScenario(scenario, config), { errors: [], warnings: [] });
  });
});

describe('lintScenario', () => {
  const lint = (/** @type {string} */ content) =>
    lintScenario(parseScenario(FILE, content, config), config);

  test('a valid scenario has no error and no warning', () => {
    assert.deepEqual(lint(VALID), { errors: [], warnings: [] });
  });

  test('requires the front-matter fields', () => {
    const { errors } = lint(
      VALID.replace('tier: critical   # comment', 'tier: urgent').replace(
        'id: cm-create-article',
        'id: Bad_Id'
      )
    );
    assert.equal(errors.length, 2);
    assert.match(errors.join('\n'), /kebab-case/);
    assert.match(errors.join('\n'), /`tier`/);
  });

  test('requires numbered steps and bulleted expected results', () => {
    const { errors } = lint(
      VALID.replace(
        '1. Aller dans le Content Manager.\n2. Créer une entrée.',
        'Aller dans le Content Manager.'
      ).replace("- Une notification de succès s'affiche.", "Une notification de succès s'affiche.")
    );
    assert.equal(errors.length, 2);
  });

  test('flags a missing section', () => {
    const { errors } = lint(VALID.replace(/## Résultats attendus[\s\S]*$/, ''));
    assert.match(errors.join('\n'), /Expected results/);
  });

  test('warns about EE and out-of-scope keywords, without blocking', () => {
    const { errors, warnings } = lint(
      VALID.replace('edition: CE', 'edition: EE').replace('Créer une entrée.', 'Appeler GraphQL.')
    );
    assert.deepEqual(errors, []);
    assert.equal(warnings.length, 2);
  });
});

describe('spec header', () => {
  test('is written once and read back', () => {
    const scenario = parseScenario(FILE, VALID, config);
    const once = withSpecHeader("import { test } from '../../../fixtures';\n", scenario);
    const twice = withSpecHeader(once, scenario);
    assert.equal(once, twice);
    assert.deepEqual(readSpecHeader(once), {
      scenario: FILE,
      id: 'cm-create-article',
      hash: scenario.hash,
    });
  });

  test('the hash ignores line endings but not the text', () => {
    assert.equal(hashScenario(VALID), hashScenario(VALID.replace(/\n/g, '\r\n')));
    assert.notEqual(hashScenario(VALID), hashScenario(VALID.replace('Créer', 'Modifier')));
  });
});

describe('globToRegExp', () => {
  test('`**` spans folders, `*` does not', () => {
    assert.ok(
      globToRegExp('tests-next/ui/pages/**').test('tests-next/ui/pages/settings/roles-page.ts')
    );
    assert.ok(
      !globToRegExp('tests-next/ui/pages/*').test('tests-next/ui/pages/settings/roles-page.ts')
    );
    assert.ok(globToRegExp('tests-next/ui/setup/schema.ts').test('tests-next/ui/setup/schema.ts'));
    assert.ok(!globToRegExp('tests-next/ui/setup/schema.ts').test('tests-next/ui/setup/schema-ts'));
  });
});

describe('checkChanges', () => {
  const spec = 'tests-next/ui/tests/generated/auth/logout.ui-test.ts';
  /** @param {Partial<import('../lib.mjs').FileChange>} change */
  const change = (change) => ({
    path: spec,
    status: /** @type {const} */ ('M'),
    added: [],
    removed: [],
    ...change,
  });

  test('allows a generated spec, a Page Object and the schema', () => {
    const violations = checkChanges({
      mode: 'generate',
      config,
      changes: [
        change({ status: 'A', added: ["await expect(page.getByText('Hello')).toBeVisible();"] }),
        change({ path: 'tests-next/ui/pages/media-library/library-page.ts', status: 'A' }),
        change({
          path: 'tests-next/ui/setup/schema.ts',
          added: ["scaffoldContentType(app, { singularName: 'product' });"],
        }),
      ],
    });
    assert.deepEqual(violations, []);
  });

  test('refuses paths outside the allowed ones, and the schema in heal mode', () => {
    const violations = checkChanges({
      mode: 'heal',
      config,
      changes: [
        change({ path: 'packages/core/admin/src/index.ts' }),
        change({ path: 'tests-next/ui/setup/schema.ts' }),
        change({ path: 'tests-next/ui/tests/auth/login.ui-test.ts' }),
        change({ path: 'tests-next/ui/scenarios/auth/logout.md' }),
      ],
    });
    assert.equal(violations.length, 4);
  });

  test('refuses skips, fixed waits and env flags', () => {
    const violations = checkChanges({
      mode: 'generate',
      config,
      changes: [
        change({
          added: [
            "test.skip('later', async () => {});",
            "test.skip(process.env.E2E_MEDIA_LIBRARY !== 'current');",
            'await page.waitForTimeout(500);',
            "await page.waitForLoadState('networkidle');",
            'describeOnCondition(isEE)("x", () => {});',
          ],
        }),
      ],
    });
    assert.ok(violations.some((violation) => violation.includes('skip / fixme / only')));
    assert.ok(violations.some((violation) => violation.includes('E2E_MEDIA_LIBRARY')));
    assert.ok(violations.some((violation) => violation.includes('waitForTimeout')));
    assert.ok(violations.some((violation) => violation.includes('networkidle')));
    assert.ok(violations.some((violation) => violation.includes('describeOnCondition')));
  });

  test('a removed assertion is refused, unless the spec is regenerated from a changed scenario', () => {
    const removed = change({ removed: ["await expect(list.row('Hello')).toBeVisible();"] });
    assert.equal(checkChanges({ mode: 'heal', config, changes: [removed] }).length, 1);
    assert.equal(checkChanges({ mode: 'generate', config, changes: [removed] }).length, 1);
    assert.deepEqual(
      checkChanges({ mode: 'generate', config, changes: [removed], regenerated: [spec] }),
      []
    );
    // A healer may still change a Page Object's readiness wait.
    const pageObject = change({
      path: 'tests-next/ui/pages/roles-page.ts',
      removed: ['await expect(this.heading).toBeVisible();'],
    });
    assert.deepEqual(checkChanges({ mode: 'heal', config, changes: [pageObject] }), []);
  });

  test('deletions: only generated specs, in generate mode', () => {
    assert.deepEqual(
      checkChanges({ mode: 'generate', config, changes: [change({ status: 'D' })] }),
      []
    );
    assert.equal(
      checkChanges({ mode: 'heal', config, changes: [change({ status: 'D' })] }).length,
      1
    );
    assert.equal(
      checkChanges({
        mode: 'generate',
        config,
        changes: [change({ path: 'tests-next/ui/pages/index.ts', status: 'D' })],
      }).length,
      1
    );
  });

  test('scratch files left behind are refused', () => {
    const scratch = change({
      path: 'tests-next/ui/tests/generated/_scratch/explore.ui-test.ts',
      status: 'A',
    });
    assert.equal(checkChanges({ mode: 'generate', config, changes: [scratch] }).length, 1);
  });
});

describe('parseUnifiedDiff', () => {
  test('splits added and removed lines per file, for added, modified and deleted files', () => {
    const diff = [
      'diff --git a/a.ts b/a.ts',
      '--- a/a.ts',
      '+++ b/a.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
      'diff --git a/b.ts b/b.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/b.ts',
      '@@ -0,0 +1,2 @@',
      '+one',
      '+two',
      'diff --git a/c.ts b/c.ts',
      'deleted file mode 100644',
      '--- a/c.ts',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-gone',
    ].join('\n');
    const changes = parseUnifiedDiff(
      diff,
      new Map([
        ['a.ts', /** @type {const} */ ('M')],
        ['b.ts', /** @type {const} */ ('A')],
        ['c.ts', /** @type {const} */ ('D')],
      ])
    );
    assert.deepEqual(changes, [
      { path: 'a.ts', status: 'M', added: ['new'], removed: ['old'] },
      { path: 'b.ts', status: 'A', added: ['one', 'two'], removed: [] },
      { path: 'c.ts', status: 'D', added: [], removed: ['gone'] },
    ]);
  });
});
