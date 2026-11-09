import type { CodeFinding } from '../../../../shared/contracts/migration';

const SOURCE_FILE = /^src\/.+\.(?:[cm]?[jt]sx?)$/;
const OLD_UID = 'plugin::users-permissions.user';
const PLUGIN_SERVICE = /plugin\(\s*(['"])users-permissions\1\s*\)/;
const MODELS = /\bmodels\s*:/;

const lineOf = (
  lines: string[],
  index: number,
  rule: CodeFinding['rule'],
  path: string,
  message: string
) => ({ path, line: index + 1, rule, message }) satisfies CodeFinding;

/** The lines a `models: [...]` list spans, starting at the line that opens it */
const modelsSpan = (lines: string[], start: number): number => {
  let depth = 0;
  let opened = false;

  for (let index = start; index < lines.length; index += 1) {
    const text = index === start ? lines[index].slice(lines[index].search(MODELS)) : lines[index];

    for (const char of text) {
      if (char === '[') {
        depth += 1;
        opened = true;
      } else if (char === ']') {
        depth -= 1;
      }
    }

    if (opened && depth <= 0) {
      return index;
    }
  }

  return start;
};

/**
 * Lists the code of a project that names Users & Permissions, with its line. A text scan that
 * changes nothing: what to use instead is in the plugin's migration guide, rule by rule.
 */
export const scanCode = (path: string, source: string): CodeFinding[] => {
  if (!SOURCE_FILE.test(path)) {
    return [];
  }

  const lines = source.split(/\r?\n/);
  const findings: CodeFinding[] = [];
  const inLifecycle = new Set<number>();

  lines.forEach((text, index) => {
    if (!MODELS.test(text)) {
      return;
    }

    const end = modelsSpan(lines, index);
    const names = lines.slice(index, end + 1).some((line) => line.includes(OLD_UID));

    if (names) {
      findings.push(
        lineOf(
          lines,
          index,
          'lifecycle',
          path,
          `A lifecycle subscription on ${OLD_UID}: subscribe to plugin::end-users.user (account fields) or plugin::end-users.profile (your own fields).`
        )
      );

      for (let at = index; at <= end; at += 1) {
        inLifecycle.add(at);
      }
    }
  });

  lines.forEach((text, index) => {
    if (text.includes(OLD_UID) && !inLifecycle.has(index)) {
      findings.push(
        lineOf(
          lines,
          index,
          'old-uid',
          path,
          `Names ${OLD_UID}: use plugin::end-users.user, or plugin::end-users.profile for your own fields.`
        )
      );
    }

    if (PLUGIN_SERVICE.test(text)) {
      findings.push(
        lineOf(
          lines,
          index,
          'plugin-service',
          path,
          "Uses the users-permissions plugin's services: the end-users plugin's services replace them."
        )
      );
    }

    if (text.includes('providers-registry')) {
      findings.push(
        lineOf(
          lines,
          index,
          'custom-provider',
          path,
          'Registers a custom login provider with users-permissions: register it as an end-users provider instead.'
        )
      );
    }
  });

  return findings.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
};
