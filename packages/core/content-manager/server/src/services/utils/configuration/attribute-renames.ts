/**
 * Old attribute name to the name it has after this save and every earlier
 * save whose map is still stored. Identity entries are omitted: a field that
 * was renamed back to its original name must not keep rewriting itself.
 */
const composeAttributeRenames = (
  previous: Record<string, string> = {},
  next: Record<string, string> = {}
): Record<string, string> => {
  const composed: Record<string, string> = {};

  for (const [from, to] of Object.entries(previous)) {
    composed[from] = next[to] ?? to;
  }

  for (const [from, to] of Object.entries(next)) {
    composed[from] = to;
  }

  for (const [from, to] of Object.entries(composed)) {
    if (from === to) {
      delete composed[from];
    }
  }

  return composed;
};

const renamePath = (
  path: string | undefined,
  renames: Record<string, string>
): string | undefined => {
  if (!path) {
    return path;
  }

  if (renames[path]) {
    return renames[path];
  }

  const [head, ...rest] = path.split('.');

  if (rest.length > 0 && renames[head]) {
    return [renames[head], ...rest].join('.');
  }

  return path;
};

type FieldMetadata = {
  edit?: { label?: string; mainField?: string; [key: string]: unknown };
  list?: { label?: string; mainField?: string; [key: string]: unknown };
};

type StoredConfiguration = {
  settings?: {
    mainField?: string;
    defaultSortBy?: string;
    [key: string]: unknown;
  };
  metadatas?: Record<string, FieldMetadata>;
  layouts?: {
    list?: string[];
    edit?: { name: string; size: number }[][];
    editRelations?: string[];
    [key: string]: unknown;
  };
  attributeRenames?: Record<string, string>;
  [key: string]: unknown;
};

type RelationAttribute = {
  type?: string;
  target?: string;
  targetModel?: string;
};

const replaceNames = (names: string[] | undefined, renames: Record<string, string>): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const name of names ?? []) {
    const renamed = renames[name] ?? name;

    if (seen.has(renamed)) {
      continue;
    }

    seen.add(renamed);
    next.push(renamed);
  }

  return next;
};

const movedMetadata = (metadata: FieldMetadata, from: string, to: string): FieldMetadata => {
  if (from === to) {
    return metadata;
  }

  return {
    ...metadata,
    edit: metadata.edit
      ? { ...metadata.edit, label: metadata.edit.label === from ? to : metadata.edit.label }
      : metadata.edit,
    list: metadata.list
      ? { ...metadata.list, label: metadata.list.label === from ? to : metadata.list.label }
      : metadata.list,
  };
};

/**
 * One pass over the original metadata. Applying the map in place deletes one
 * side of a swap (`title -> slug`, `slug -> title`), because the destination
 * key is still occupied when the source is moved.
 */
const renameMetadata = (
  metadatas: Record<string, FieldMetadata>,
  renames: Record<string, string>
): Record<string, FieldMetadata> => {
  const next: Record<string, FieldMetadata> = {};

  for (const [name, metadata] of Object.entries(metadatas)) {
    const to = renames[name];

    if (!to || to === name || next[to]) {
      continue;
    }

    next[to] = movedMetadata(metadata, name, to);
  }

  for (const [name, metadata] of Object.entries(metadatas)) {
    const to = renames[name];

    if ((to && to !== name) || next[name]) {
      continue;
    }

    next[name] = metadata;
  }

  return next;
};

/**
 * A relation's `mainField` names a field on the target, so a rename of that
 * target has to be applied from the configuration of whoever owns the relation.
 */
const renameRelationMainFields = (
  metadatas: Record<string, FieldMetadata>,
  attributes: Record<string, RelationAttribute> | undefined,
  allRenames: Record<string, Record<string, string>>
): Record<string, FieldMetadata> => {
  const next: Record<string, FieldMetadata> = { ...metadatas };

  for (const [name, attribute] of Object.entries(attributes ?? {})) {
    if (attribute?.type !== 'relation') {
      continue;
    }

    const targetRenames = allRenames[attribute.target ?? attribute.targetModel ?? ''];
    const metadata = next[name];

    if (!targetRenames || !metadata) {
      continue;
    }

    next[name] = {
      ...metadata,
      edit: metadata.edit
        ? {
            ...metadata.edit,
            mainField:
              typeof metadata.edit.mainField === 'string'
                ? (targetRenames[metadata.edit.mainField] ?? metadata.edit.mainField)
                : metadata.edit.mainField,
          }
        : metadata.edit,
      list: metadata.list
        ? {
            ...metadata.list,
            mainField:
              typeof metadata.list.mainField === 'string'
                ? (targetRenames[metadata.list.mainField] ?? metadata.list.mainField)
                : metadata.list.mainField,
          }
        : metadata.list,
    };
  }

  return next;
};

/**
 * Rewrites one stored Content Manager configuration for a rename save.
 *
 * Returns null when there is nothing to store. A model that has never been
 * opened still gets a configuration when one of its own attributes was
 * renamed, so the browser can repair a column list saved before the rename.
 */
const rewriteContentManagerConfiguration = (
  configuration: StoredConfiguration | null | undefined,
  {
    attributes,
    ownRenames = {},
    allRenames,
  }: {
    attributes?: Record<string, RelationAttribute>;
    ownRenames?: Record<string, string>;
    allRenames: Record<string, Record<string, string>>;
  }
): StoredConfiguration | null => {
  const hasOwnRenames = Object.keys(ownRenames).length > 0;

  if (!configuration && !hasOwnRenames) {
    return null;
  }

  const current = configuration ?? {};
  const attributeRenames = composeAttributeRenames(current.attributeRenames, ownRenames);
  const metadatas = renameRelationMainFields(
    renameMetadata(current.metadatas ?? {}, ownRenames),
    attributes,
    allRenames
  );
  const next: StoredConfiguration = {
    ...current,
    settings: current.settings
      ? {
          ...current.settings,
          mainField: renamePath(current.settings.mainField, ownRenames),
          defaultSortBy: renamePath(current.settings.defaultSortBy, ownRenames),
        }
      : current.settings,
    metadatas,
    layouts: current.layouts
      ? {
          ...current.layouts,
          ...(Array.isArray(current.layouts.list)
            ? { list: replaceNames(current.layouts.list, ownRenames) }
            : {}),
          ...(Array.isArray(current.layouts.edit)
            ? {
                edit: current.layouts.edit.map((row) =>
                  row.map((field) => ({ ...field, name: ownRenames[field.name] ?? field.name }))
                ),
              }
            : {}),
          ...(Array.isArray(current.layouts.editRelations)
            ? { editRelations: replaceNames(current.layouts.editRelations, ownRenames) }
            : {}),
        }
      : current.layouts,
  };

  if (Object.keys(attributeRenames).length > 0) {
    next.attributeRenames = attributeRenames;
  } else {
    delete next.attributeRenames;
  }

  return next;
};

export { composeAttributeRenames, rewriteContentManagerConfiguration };
export type { StoredConfiguration };
