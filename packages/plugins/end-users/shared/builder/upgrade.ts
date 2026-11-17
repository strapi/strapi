import type { BuilderConditionV1 } from '../contracts/conditions';
import type { BuilderValue, BuilderConditionV2, EntryCheck } from './types';

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const PLACEHOLDER = /^\$(user|profile|params|now)/;

const toValue = (name: string, value: unknown): BuilderValue => {
  if (Array.isArray(value)) {
    if (value.some((item) => typeof item === 'string' && PLACEHOLDER.test(item))) {
      throw new Error(
        `Can't upgrade ${name}: a list can't hold $user, $profile or $params values.`
      );
    }
  } else if (value === '$now') {
    return { kind: 'now' };
  } else if (typeof value === 'string' && value.startsWith('$user.')) {
    return { kind: 'user', attribute: value.slice('$user.'.length) };
  } else if (typeof value === 'string' && PLACEHOLDER.test(value)) {
    throw new Error(`Can't upgrade ${name}: ${value} isn't a value a rule can hold.`);
  }

  return { kind: 'fixed', value: value as Extract<BuilderValue, { kind: 'fixed' }>['value'] };
};

/** One clause row, `{ author: { documentId: { $eq: ... } } }` or `{ title: { $contains: ... } }` */
const toChecks = (name: string, operand: unknown): EntryCheck[] => {
  if (!isPlain(operand) || Object.keys(operand).length === 0) {
    throw new Error(`Can't upgrade ${name}: its condition isn't a set of operators.`);
  }

  // A relation is filtered on its `documentId`
  const byId = isPlain(operand.documentId) ? operand.documentId : undefined;

  if (byId && (Object.keys(operand).length > 1 || Object.keys(byId).length === 0)) {
    throw new Error(`Can't upgrade ${name}: its condition isn't a set of operators.`);
  }

  const path = byId ? [name, 'documentId'] : [name];
  const operators = byId ?? operand;

  return Object.entries(operators).map(([operator, value]) => ({
    kind: 'check',
    target: { path },
    operator,
    value: toValue(name, value),
  }));
};

/**
 * A version 1 file is an "all of" group of entry checks. Never widens a rule: what can't be carried over exactly throws
 */
export const upgradeVersion1 = (file: BuilderConditionV1): BuilderConditionV2 => {
  const items = file.query.$and.flatMap((clause) => {
    const rows = Object.entries(clause);

    if (rows.length === 0) {
      throw new Error("Can't upgrade: a clause is empty.");
    }

    return rows.flatMap(([name, operand]) => toChecks(name, operand));
  });

  if (items.length === 0) {
    throw new Error("Can't upgrade: the rule has no clauses.");
  }

  return {
    version: 2,
    slug: file.slug,
    displayName: file.displayName,
    appliesTo: { kind: 'types', types: [...file.subjects] },
    inputs: [],
    who: { match: 'all', checks: [] },
    which: { kind: 'group', match: 'all', items },
    onSave: { stamp: [], locked: [] },
  };
};
