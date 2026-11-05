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
 * @description Returns the component at the given key path, if the form still holds it.
 */
const getComponentAt = (values: unknown, keyPath: string): unknown => {
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
      return undefined;
    }
  }

  return current;
};

/**
 * @description Tells whether the form still holds the component at the given key path.
 */
const hasComponentAt = (values: unknown, keyPath: string): boolean =>
  getComponentAt(values, keyPath) !== undefined;

/* -------------------------------------------------------------------------------------------------
 * Copy marker
 * -----------------------------------------------------------------------------------------------*/

/**
 * Set on the components put in the form by a copy. Key paths aren't enough to recognise them:
 * "Fill in from another locale" replaces the values with rows that reuse the same temp keys
 * (`a0`, `a1`…), so a copy's key path can point to a component that wasn't copied. Editing a field
 * clones the objects on its path with `lodash/clone`, which keeps symbol keys, while values that
 * replace the component don't carry the marker. Symbol keys aren't serialised, so the marker never
 * reaches the API.
 */
const COPIED = Symbol('copied');

const withCopyMarker = (item: AnyData): AnyData => ({ ...item, [COPIED]: true });

/**
 * @description Tells whether the form still holds, at the given key path, the component that was
 * copied there.
 */
const hasCopyAt = (values: unknown, keyPath: string): boolean => {
  const component = getComponentAt(values, keyPath);

  return isObject(component) && (component as Record<symbol, unknown>)[COPIED] === true;
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

  // A copied component that's removed or replaced (e.g. by "Fill in from another locale") drops its
  // flag, so that a component put at the same key path can't inherit it.
  React.useEffect(() => {
    setCopiedPaths((paths) => {
      const kept = paths.filter((path) => hasCopyAt(values, path));

      return kept.length === paths.length ? paths : kept;
    });
  }, [values]);

  const markCopied = React.useCallback((keyPaths: string[]) => {
    setCopiedPaths((paths) => {
      const added = keyPaths.filter((keyPath) => !paths.includes(keyPath));

      return added.length > 0 ? [...paths, ...added] : paths;
    });
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
        ...items.map((item, index) => withCopyMarker({ ...item, __temp_key__: keys[index] })),
      ]);
      markCopied?.(keys.map((key) => getComponentKeyPath(fieldKeyPath, key)));
    },
    [fieldKeyPath, markCopied, name, onChange, value]
  );

  return { isCopied, insertCopies };
};

/* -------------------------------------------------------------------------------------------------
 * useCopiedComponent
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description Puts a copied component in a non-repeatable component field and tells whether the
 * field holds a copy. The flag is set on the field itself: resetting the field drops it, so a
 * component added afterwards isn't flagged. Without a `CopiedComponentsProvider` the copy is still
 * put in place, it's just not flagged.
 */
const useCopiedComponent = (name: string) => {
  const copiedPaths = useCopiedComponentsContext(
    'useCopiedComponent',
    (state) => state.copiedPaths,
    false
  );
  const markCopied = useCopiedComponentsContext(
    'useCopiedComponent',
    (state) => state.markCopied,
    false
  );
  const { onChange } = useField<AnyData | null>(name);
  const fieldKeyPath = useForm('useCopiedComponent', (state) =>
    getFieldKeyPath(state.values, name)
  );

  const isCopied = copiedPaths?.includes(fieldKeyPath) ?? false;

  const insertCopy = React.useCallback(
    (item: AnyData) => {
      onChange(name, withCopyMarker(item));
      markCopied?.([fieldKeyPath]);
    },
    [fieldKeyPath, markCopied, name, onChange]
  );

  return { isCopied, insertCopy };
};

export {
  CopiedComponentsProvider,
  useCopiedComponents,
  useCopiedComponent,
  getFieldKeyPath,
  hasComponentAt,
};
export type { CopiedComponentsProviderProps };
