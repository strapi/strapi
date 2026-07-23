import ts from 'typescript';

import {
  classifyDynamicPattern,
  expandRegistryMessageIds,
  expandTemplateToJsonKeys,
  resolveMessageId,
  toJsonKey,
  toMessageId,
} from './patterns';
import type { MessageExtraction, TranslationBundle } from './types';
import { listSourceFiles, readJsonRecord } from './bundles';

const TRANSLATION_HELPERS = new Set(['getTrad', 'getTranslation', 'getTranslationKey']);

export type ResolvedId = {
  messageId: string | null;
  targetBundle?: 'core/admin' | 'self';
  propertyName?: string;
};

const getLine = (sourceFile: ts.SourceFile, node: ts.Node) =>
  sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

const getStringLiteralValue = (node: ts.Expression | undefined): string | null => {
  if (!node) {
    return null;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isTemplateExpression(node)) {
    const head = node.head.text;
    const spans = node.templateSpans.map((span) => span.literal.text);
    const holes = node.templateSpans.map(() => '${…}');

    return [head, ...holes.flatMap((hole, index) => [hole, spans[index] ?? ''])].join('');
  }

  if (ts.isParenthesizedExpression(node)) {
    return getStringLiteralValue(node.expression);
  }

  return null;
};

const getPropertyName = (name: ts.PropertyName): string | null => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return null;
};

const loadPluginIdConstants = (bundle: TranslationBundle): Record<string, string> => {
  const constants: Record<string, string> = {
    PLUGIN_ID: bundle.pluginPrefix ?? '',
    pluginId: bundle.pluginPrefix ?? '',
  };

  for (const sourceDir of bundle.sourceDirs) {
    const candidates = ['constants/plugin.ts', 'pluginId.ts', 'constants.ts'];

    for (const relativePath of candidates) {
      const filePath = `${sourceDir}/${relativePath}`;

      if (!ts.sys.fileExists(filePath)) {
        continue;
      }

      const sourceFile = ts.createSourceFile(
        filePath,
        ts.sys.readFile(filePath)!,
        ts.ScriptTarget.Latest,
        true
      );

      sourceFile.forEachChild((node) => {
        if (!ts.isVariableStatement(node)) {
          return;
        }

        for (const decl of node.declarationList.declarations) {
          if (!ts.isIdentifier(decl.name) || !decl.initializer) {
            continue;
          }

          const value = getStringLiteralValue(decl.initializer);

          if (value) {
            constants[decl.name.text] = value;
          }
        }
      });
    }
  }

  return constants;
};

const foldTemplateExpression = (
  node: ts.TemplateExpression,
  constants: Record<string, string>
): string | null => {
  const head = node.head.text;
  const parts = [head];

  for (const span of node.templateSpans) {
    const expr = span.expression;

    if (ts.isIdentifier(expr) && constants[expr.text]) {
      parts.push(constants[expr.text], span.literal.text);
      continue;
    }

    parts.push('${…}', span.literal.text);
  }

  return parts.join('');
};

const resolveHelperCall = (node: ts.CallExpression): string | null => {
  const callee = node.expression;

  if (!ts.isIdentifier(callee) || !TRANSLATION_HELPERS.has(callee.text)) {
    return null;
  }

  return getStringLiteralValue(node.arguments[0]);
};

export const resolveIdExpression = (
  expr: ts.Expression,
  bundle: TranslationBundle,
  pluginEnKeys: Set<string>,
  adminEnKeys: Set<string>,
  constants: Record<string, string>
): ResolvedId => {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    const resolved = resolveMessageId(expr.text, bundle.pluginPrefix, pluginEnKeys, adminEnKeys);

    return resolved;
  }

  if (ts.isTemplateExpression(expr)) {
    const folded = foldTemplateExpression(expr, constants) ?? getStringLiteralValue(expr);

    if (!folded) {
      return { messageId: null };
    }

    return resolveMessageId(folded, bundle.pluginPrefix, pluginEnKeys, adminEnKeys);
  }

  if (ts.isCallExpression(expr)) {
    const resolved = resolveHelperCall(expr);

    if (resolved) {
      return resolveMessageId(resolved, bundle.pluginPrefix, pluginEnKeys, adminEnKeys, true);
    }
  }

  if (ts.isIdentifier(expr)) {
    return { messageId: null, propertyName: expr.text };
  }

  if (ts.isPropertyAccessExpression(expr)) {
    return { messageId: null, propertyName: expr.getText() };
  }

  if (ts.isConditionalExpression(expr)) {
    const whenTrue = resolveIdExpression(
      expr.whenTrue,
      bundle,
      pluginEnKeys,
      adminEnKeys,
      constants
    );
    const whenFalse = resolveIdExpression(
      expr.whenFalse,
      bundle,
      pluginEnKeys,
      adminEnKeys,
      constants
    );

    if (whenTrue.messageId && whenFalse.messageId) {
      return {
        messageId: `${whenTrue.messageId}|${whenFalse.messageId}`,
        targetBundle: 'core/admin',
      };
    }
  }

  return { messageId: null };
};

const readObjectDescriptor = (
  node: ts.ObjectLiteralExpression,
  bundle: TranslationBundle,
  pluginEnKeys: Set<string>,
  adminEnKeys: Set<string>,
  constants: Record<string, string>
): {
  messageId: string | null;
  targetBundle?: 'core/admin' | 'self';
  defaultMessage: string | null;
  propertyName?: string;
} => {
  let defaultMessage: string | null = null;
  let idNode: ts.Expression | undefined;

  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) {
      continue;
    }

    const key = getPropertyName(prop.name);

    if (key === 'id') {
      idNode = prop.initializer;
    }

    if (key === 'defaultMessage') {
      defaultMessage = getStringLiteralValue(prop.initializer);
    }
  }

  if (!idNode) {
    return { messageId: null, defaultMessage };
  }

  const resolved = resolveIdExpression(idNode, bundle, pluginEnKeys, adminEnKeys, constants);

  return {
    messageId: resolved.messageId,
    targetBundle: resolved.targetBundle,
    defaultMessage,
    propertyName: resolved.propertyName,
  };
};

const buildExtraction = (
  sourceFile: ts.SourceFile,
  node: ts.Node,
  bundle: TranslationBundle,
  enKeys: string[],
  messageId: string | null,
  targetBundle: 'core/admin' | 'self' | undefined,
  defaultMessage: string | null,
  propertyName?: string
): MessageExtraction | null => {
  if (!messageId && propertyName) {
    const classification = classifyDynamicPattern('', '', propertyName);

    return {
      file: sourceFile.fileName,
      line: getLine(sourceFile, node),
      kind: classification.kind,
      jsonKey: null,
      messageId: null,
      defaultMessage,
      note: classification.note,
      targetBundle: bundle.packageName,
    };
  }

  if (!messageId) {
    return null;
  }

  if (targetBundle === 'core/admin') {
    return {
      file: sourceFile.fileName,
      line: getLine(sourceFile, node),
      kind: 'static',
      jsonKey: null,
      messageId,
      defaultMessage,
      targetBundle: 'core/admin',
    };
  }

  const branches = messageId.includes('|') ? messageId.split('|') : [messageId];
  const expandedJsonKeys = new Set<string>();
  let kind: MessageExtraction['kind'] = 'static';
  let note: string | undefined;

  for (const branch of branches) {
    const jsonKey = toJsonKey(branch, bundle.pluginPrefix);
    const classification = classifyDynamicPattern(jsonKey, branch, propertyName);
    kind = classification.kind;
    note = classification.note;

    if (classification.kind === 'schema-driven' || classification.kind === 'error-passthrough') {
      return {
        file: sourceFile.fileName,
        line: getLine(sourceFile, node),
        kind: classification.kind,
        jsonKey: null,
        messageId: null,
        defaultMessage,
        note,
        targetBundle: bundle.packageName,
      };
    }

    if (classification.kind === 'registry') {
      for (const registryId of expandRegistryMessageIds(branch)) {
        expandedJsonKeys.add(toJsonKey(registryId, bundle.pluginPrefix));
      }

      continue;
    }

    if (branch.includes('${')) {
      kind = 'finite-enum';

      for (const key of expandTemplateToJsonKeys(branch, enKeys, bundle.pluginPrefix)) {
        expandedJsonKeys.add(key);
      }

      continue;
    }

    expandedJsonKeys.add(jsonKey);
  }

  const keys = [...expandedJsonKeys];

  return {
    file: sourceFile.fileName,
    line: getLine(sourceFile, node),
    kind: keys.length > 1 ? 'finite-enum' : kind,
    jsonKey: keys.length === 1 ? keys[0] : null,
    messageId: keys.length === 1 ? toMessageId(keys[0], bundle.pluginPrefix) : null,
    defaultMessage,
    expandedJsonKeys: keys.length > 1 ? keys : undefined,
    note,
    targetBundle: bundle.packageName,
  };
};

const visitNode = (
  sourceFile: ts.SourceFile,
  node: ts.Node,
  bundle: TranslationBundle,
  enKeys: string[],
  pluginEnKeys: Set<string>,
  adminEnKeys: Set<string>,
  constants: Record<string, string>,
  results: MessageExtraction[]
) => {
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    const isFormatMessage =
      (ts.isIdentifier(callee) && callee.text === 'formatMessage') ||
      (ts.isPropertyAccessExpression(callee) && callee.name.text === 'formatMessage');

    if (isFormatMessage) {
      const arg = node.arguments[0];

      if (arg && ts.isObjectLiteralExpression(arg)) {
        const { messageId, targetBundle, defaultMessage, propertyName } = readObjectDescriptor(
          arg,
          bundle,
          pluginEnKeys,
          adminEnKeys,
          constants
        );
        const extraction = buildExtraction(
          sourceFile,
          node,
          bundle,
          enKeys,
          messageId,
          targetBundle,
          defaultMessage,
          propertyName
        );

        if (extraction) {
          results.push(extraction);
        }
      }
    }

    if (ts.isIdentifier(callee) && TRANSLATION_HELPERS.has(callee.text)) {
      const raw = resolveHelperCall(node);

      if (raw) {
        const resolved = resolveMessageId(
          raw,
          bundle.pluginPrefix,
          pluginEnKeys,
          adminEnKeys,
          true
        );
        const extraction = buildExtraction(
          sourceFile,
          node,
          bundle,
          enKeys,
          resolved.messageId,
          resolved.targetBundle,
          null
        );

        if (extraction) {
          results.push(extraction);
        }
      }
    }
  }

  if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
    if (node.tagName.getText(sourceFile) === 'FormattedMessage') {
      let messageId: string | null = null;
      let targetBundle: 'core/admin' | 'self' | undefined;
      let defaultMessage: string | null = null;
      let propertyName: string | undefined;

      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || !attr.initializer) {
          continue;
        }

        const attrName = attr.name.getText(sourceFile);

        if (attrName === 'id' && ts.isStringLiteral(attr.initializer)) {
          const resolved = resolveMessageId(
            attr.initializer.text,
            bundle.pluginPrefix,
            pluginEnKeys,
            adminEnKeys
          );
          messageId = resolved.messageId;
          targetBundle = resolved.targetBundle;
        }

        if (
          attrName === 'id' &&
          ts.isJsxExpression(attr.initializer) &&
          attr.initializer.expression
        ) {
          const resolved = resolveIdExpression(
            attr.initializer.expression,
            bundle,
            pluginEnKeys,
            adminEnKeys,
            constants
          );
          messageId = resolved.messageId;
          targetBundle = resolved.targetBundle;
          propertyName = resolved.propertyName;
        }

        if (attrName === 'defaultMessage' && ts.isStringLiteral(attr.initializer)) {
          defaultMessage = attr.initializer.text;
        }
      }

      const extraction = buildExtraction(
        sourceFile,
        node,
        bundle,
        enKeys,
        messageId,
        targetBundle,
        defaultMessage,
        propertyName
      );

      if (extraction) {
        results.push(extraction);
      }
    }
  }

  if (
    ts.isPropertyAssignment(node) &&
    getPropertyName(node.name) === 'intlLabel' &&
    ts.isObjectLiteralExpression(node.initializer)
  ) {
    const { messageId, targetBundle, defaultMessage } = readObjectDescriptor(
      node.initializer,
      bundle,
      pluginEnKeys,
      adminEnKeys,
      constants
    );

    if (messageId) {
      const extraction = buildExtraction(
        sourceFile,
        node,
        bundle,
        enKeys,
        messageId,
        targetBundle,
        defaultMessage
      );

      if (extraction) {
        results.push(extraction);
      }
    }
  }

  ts.forEachChild(node, (child) =>
    visitNode(sourceFile, child, bundle, enKeys, pluginEnKeys, adminEnKeys, constants, results)
  );
};

export const extractMessages = (
  bundle: TranslationBundle,
  adminEnKeys: Set<string>
): MessageExtraction[] => {
  const enJson = readJsonRecord(bundle.enJsonPath);
  const enKeys = Object.keys(enJson);
  const pluginEnKeys = new Set(enKeys);
  const constants = loadPluginIdConstants(bundle);
  const results: MessageExtraction[] = [];

  for (const filePath of listSourceFiles(bundle)) {
    const sourceText = ts.sys.readFile(filePath);

    if (!sourceText) {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    visitNode(
      sourceFile,
      sourceFile,
      bundle,
      enKeys,
      pluginEnKeys,
      adminEnKeys,
      constants,
      results
    );
  }

  return results;
};

export const extractValidationErrorKeys = (
  bundle: TranslationBundle,
  adminEnKeys: Set<string>
): { local: string[]; admin: string[] } => {
  const local = new Set<string>();
  const admin = new Set<string>();
  const localPattern = /^(error\.|validation\.)/;

  for (const filePath of listSourceFiles(bundle)) {
    const sourceText = ts.sys.readFile(filePath);

    if (!sourceText) {
      continue;
    }

    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        if (localPattern.test(node.text)) {
          local.add(node.text);
        } else if (node.text.startsWith('notification.')) {
          admin.add(node.text);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return {
    local: [...local],
    admin: [...admin].filter((key) => adminEnKeys.has(key) || key.startsWith('notification.')),
  };
};
