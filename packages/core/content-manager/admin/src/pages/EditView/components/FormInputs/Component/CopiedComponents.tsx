import * as React from 'react';

import { createContext, useField, useForm } from '@strapi/admin/strapi-admin';
import { generateNKeysBetween } from 'fractional-indexing';
import toPath from 'lodash/toPath';

import { getIn, isInteger, isObject } from '../../../../../utils/objects';

import type { AnyData } from '../../../utils/data';

/* -------------------------------------------------------------------------------------------------
 * Key paths
 * -----------------------------------------------------------------------------------------------*/

/**
 * A component is identified by the temp keys of the rows leading to it, not by their indexes:
 * `blocks.[a1].dishes.[a0]`. Rows keep their key when they're reordered, so the identity survives
 * a move, and it's gone with the row when the row is deleted.
 */
const KEY_SEGMENT = /^\[(.+)\]$/;

const getTempKey = (row: unknown): string | undefined =>
  isObject(row) && typeof row.__temp_key__ === 'string' ? row.__temp_key__ : undefined;

/**
 * @description Turns the name of a field into its key path: `blocks.1.dishes` becomes
 * `blocks.[a1].dishes`, `a1` being the temp key of the second block.
 */
const getFieldKeyPath = (values: unknown, name: string): string => {
  const segments = toPath(name);

  return segments
    .map((segment, position) => {
      if (!isInteger(segment)) {
        return segment;
      }

      const key = getTempKey(getIn(values, segments.slice(0, position + 1)));

      return `[${key ?? segment}]`;
    })
    .join('.');
};

const getComponentKeyPath = (fieldKeyPath: string, tempKey: string) =>
  `${fieldKeyPath}.[${tempKey}]`;

/**
 * @description Tells whether the form still holds the component at the given key path.
 */
const hasComponentAt = (values: unknown, keyPath: string): boolean => {
  let current: unknown = values;

  for (const segment of keyPath.split('.')) {
    const keyMatch = KEY_SEGMENT.exec(segment);

    if (keyMatch) {
      current = Array.isArray(current)
        ? current.find((row) => getTempKey(row) === keyMatch[1])
        : undefined;
    } else {
      current = isObject(current) ? current[segment] : undefined;
    }

    if (current === undefined || current === null) {
      return false;
    }
  }

  return true;
};

/* -------------------------------------------------------------------------------------------------
 * CopiedComponentsProvider
 * -----------------------------------------------------------------------------------------------*/

interface CopiedComponentsContextValue {
  /**
   * The key paths of the components copied from another entry since the form was last saved.
   */
  copiedPaths: string[];
  markCopied: (keyPaths: string[]) => void;
}

const [CopiedComponentsContextProvider, useCopiedComponentsContext] =
  createContext<CopiedComponentsContextValue>('CopiedComponents');

interface CopiedComponentsProviderProps {
  children: React.ReactNode;
}

/**
 * Remembers which components of the form were copied from another entry, so that they can be
 * flagged until the entry is saved. The state lives above the fields: a field nested in a block
 * is unmounted when the block collapses and would lose it otherwise. Must be rendered in a `Form`.
 */
const CopiedComponentsProvider = ({ children }: CopiedComponentsProviderProps) => {
  const [copiedPaths, setCopiedPaths] = React.useState<string[]>([]);
  const values = useForm('CopiedComponentsProvider', (state) => state.values);
  const isFormModified = useForm('CopiedComponentsProvider', (state) => state.modified);

  // Saving the entry, or undoing every change, clears the flags.
  React.useEffect(() => {
    if (!isFormModified) {
      setCopiedPaths((paths) => (paths.length > 0 ? [] : paths));
    }
  }, [isFormModified]);

  // A copied component that's removed from the form drops its flag, so that a component added
  // later with the same key can't inherit it.
  React.useEffect(() => {
    setCopiedPaths((paths) => {
      const kept = paths.filter((path) => hasComponentAt(values, path));

      return kept.length === paths.length ? paths : kept;
    });
  }, [values]);

  const markCopied = React.useCallback((keyPaths: string[]) => {
    setCopiedPaths((paths) => [...paths, ...keyPaths]);
  }, []);

  return (
    <CopiedComponentsContextProvider copiedPaths={copiedPaths} markCopied={markCopied}>
      {children}
    </CopiedComponentsContextProvider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * useCopiedComponents
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description Inserts copied components in a repeatable component or a dynamic zone field and
 * tells which of its rows are copies. Without a `CopiedComponentsProvider` the copies are still
 * inserted, they're just not flagged.
 */
const useCopiedComponents = (name: string) => {
  const copiedPaths = useCopiedComponentsContext(
    'useCopiedComponents',
    (state) => state.copiedPaths,
    false
  );
  const markCopied = useCopiedComponentsContext(
    'useCopiedComponents',
    (state) => state.markCopied,
    false
  );
  const { value, onChange } = useField<AnyData[] | null>(name);
  const fieldKeyPath = useForm('useCopiedComponents', (state) =>
    getFieldKeyPath(state.values, name)
  );

  const isCopied = React.useCallback(
    (tempKey: string) => copiedPaths?.includes(getComponentKeyPath(fieldKeyPath, tempKey)) ?? false,
    [copiedPaths, fieldKeyPath]
  );

  /**
   * The rows are added with their keys already set, so the copies are flagged by key rather than
   * recognised among the rows that appear next.
   */
  const insertCopies = React.useCallback(
    (items: AnyData[]) => {
      const rows = Array.isArray(value) ? value : [];
      const lastKey =
        rows
          .map(getTempKey)
          .filter((key): key is string => key !== undefined && key !== '')
          .sort()
          .pop() ?? null;
      const keys = generateNKeysBetween(lastKey, null, items.length);

      onChange(name, [
        ...rows,
        ...items.map((item, index) => ({ ...item, __temp_key__: keys[index] })),
      ]);
      markCopied?.(keys.map((key) => getComponentKeyPath(fieldKeyPath, key)));
    },
    [fieldKeyPath, markCopied, name, onChange, value]
  );

  return { isCopied, insertCopies };
};

export { CopiedComponentsProvider, useCopiedComponents, getFieldKeyPath, hasComponentAt };
export type { CopiedComponentsProviderProps };
