import fs from 'node:fs';
import ts from 'typescript';

import { readJsonRecord } from './bundles';
import { extractMessages } from './extract';
import type { TranslationBundle } from './types';

const normalizeMessage = (value: string) => value.replace(/\s+/g, ' ').trim();

const escapeForSingleQuotedString = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');

/**
 * Align in-code defaultMessage strings to the owning en.json catalog when they drift.
 * Used after --write-en so minority call sites match the English catalog (en.json).
 */
export const alignDefaultMessagesForBundle = (
  bundle: TranslationBundle,
  catalog: Record<string, string>,
  adminEnKeys: Set<string>,
  options: { target: 'self' | 'core/admin' }
): number => {
  const extractions = extractMessages(bundle, adminEnKeys);
  const editsByFile = new Map<string, Array<{ line: number; expected: string; current: string }>>();

  for (const extraction of extractions) {
    if (extraction.defaultMessage == null || !extraction.file) {
      continue;
    }

    if (
      extraction.kind === 'schema-driven' ||
      extraction.kind === 'error-passthrough' ||
      extraction.kind === 'finite-enum' ||
      (extraction.expandedJsonKeys && extraction.expandedJsonKeys.length > 1)
    ) {
      continue;
    }

    let catalogKey: string | null = null;

    if (options.target === 'self') {
      if (extraction.targetBundle === 'core/admin') {
        continue;
      }
      catalogKey = extraction.jsonKey;
    } else {
      if (extraction.targetBundle !== 'core/admin' || !extraction.messageId) {
        continue;
      }
      catalogKey = extraction.messageId.includes('|') ? null : extraction.messageId;
    }

    if (!catalogKey || !(catalogKey in catalog)) {
      continue;
    }

    const expected = catalog[catalogKey];
    if (normalizeMessage(extraction.defaultMessage) === normalizeMessage(expected)) {
      continue;
    }

    if (!editsByFile.has(extraction.file)) {
      editsByFile.set(extraction.file, []);
    }

    editsByFile.get(extraction.file)!.push({
      line: extraction.line,
      expected,
      current: extraction.defaultMessage,
    });
  }

  let filesChanged = 0;

  for (const [filePath, edits] of editsByFile) {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx')
        ? ts.ScriptKind.TSX
        : filePath.endsWith('.jsx')
          ? ts.ScriptKind.JSX
          : filePath.endsWith('.js')
            ? ts.ScriptKind.JS
            : ts.ScriptKind.TS
    );

    const replaceAt = new Map<number, string>();

    const visit = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node)) {
        let defaultMessageProp: ts.PropertyAssignment | undefined;

        for (const prop of node.properties) {
          if (!ts.isPropertyAssignment(prop)) {
            continue;
          }

          const name = ts.isIdentifier(prop.name)
            ? prop.name.text
            : ts.isStringLiteral(prop.name)
              ? prop.name.text
              : undefined;

          if (name === 'defaultMessage') {
            defaultMessageProp = prop;
          }
        }

        if (defaultMessageProp && ts.isStringLiteral(defaultMessageProp.initializer)) {
          const line =
            sourceFile.getLineAndCharacterOfPosition(defaultMessageProp.getStart(sourceFile)).line +
            1;
          const edit = edits.find(
            (candidate) =>
              candidate.line === line ||
              // id often sits on the line above defaultMessage
              candidate.line === line - 1 ||
              candidate.line === line - 2
          );

          if (
            edit &&
            normalizeMessage(defaultMessageProp.initializer.text) === normalizeMessage(edit.current)
          ) {
            replaceAt.set(
              defaultMessageProp.initializer.getStart(sourceFile),
              `'${escapeForSingleQuotedString(edit.expected)}'`
            );
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    if (replaceAt.size === 0) {
      continue;
    }

    const sorted = [...replaceAt.entries()].sort((a, b) => b[0] - a[0]);
    let next = sourceText;

    for (const [start, replacement] of sorted) {
      // Replace the full string literal token starting at `start`.
      const literalMatch = next.slice(start).match(/^(['"`])(?:\\.|(?!\1).)*\1/);
      if (!literalMatch) {
        continue;
      }

      next = `${next.slice(0, start)}${replacement}${next.slice(start + literalMatch[0].length)}`;
    }

    if (next !== sourceText) {
      fs.writeFileSync(filePath, next);
      filesChanged += 1;
    }
  }

  return filesChanged;
};

export const alignDefaultMessages = (
  bundles: TranslationBundle[],
  adminBundle: TranslationBundle
): number => {
  const adminEn = readJsonRecord(adminBundle.enJsonPath);
  const adminEnKeys = new Set(Object.keys(adminEn));
  let changed = 0;

  for (const bundle of bundles) {
    const en = readJsonRecord(bundle.enJsonPath);
    changed += alignDefaultMessagesForBundle(bundle, en, adminEnKeys, { target: 'self' });

    if (bundle.packageName !== 'core/admin') {
      changed += alignDefaultMessagesForBundle(bundle, adminEn, adminEnKeys, {
        target: 'core/admin',
      });
    }
  }

  return changed;
};
