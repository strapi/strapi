type Attributes = Record<string, unknown>;
type Renames = Record<string, string>;

const renamedName = (name: string, attributes: Attributes, renames: Renames): string | null => {
  if (Object.prototype.hasOwnProperty.call(attributes, name)) {
    return name;
  }

  const renamed = renames[name];

  if (renamed && Object.prototype.hasOwnProperty.call(attributes, renamed)) {
    return renamed;
  }

  return null;
};

/**
 * The selected list columns live in the browser. A renamed field is no longer
 * on the schema, so replace it with the name from the server map and drop a
 * name that was deleted. A name that still exists is left alone, even when an
 * older map mentions it.
 */
const applyAttributeRenamesToHeaders = (
  headers: string[],
  attributes: Attributes,
  renames: Renames
): string[] => {
  const next: string[] = [];
  const seen = new Set<string>();

  for (const header of headers) {
    const name = renamedName(header, attributes, renames);

    if (!name || seen.has(name)) {
      continue;
    }

    seen.add(name);
    next.push(name);
  }

  return next;
};

const applyAttributeRenamesToSort = (
  sort: string,
  attributes: Attributes,
  renames: Renames
): string => {
  return sort
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      const separator = trimmed.indexOf(':');
      const field = separator === -1 ? trimmed : trimmed.slice(0, separator);
      const direction = separator === -1 ? '' : trimmed.slice(separator);
      const name = renamedName(field, attributes, renames);

      if (!name || name === field) {
        return trimmed;
      }

      return `${name}${direction}`;
    })
    .join(',');
};

const applyAttributeRenamesToFilters = <T>(
  filters: T,
  attributes: Attributes,
  renames: Renames,
  renameKeys = true
): T => {
  // Keys inside a field belong to a relation, a component, or an operator.
  // The map is this content-type's attributes, so those keys stay as they are.
  if (!renameKeys || !filters || typeof filters !== 'object') {
    return filters;
  }

  if (Array.isArray(filters)) {
    return filters.map((entry) =>
      applyAttributeRenamesToFilters(entry, attributes, renames, true)
    ) as T;
  }

  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (key.startsWith('$') || key === '_q') {
      next[key] = applyAttributeRenamesToFilters(value, attributes, renames, true);
      continue;
    }

    const name = renamedName(key, attributes, renames) ?? key;

    next[name] = applyAttributeRenamesToFilters(value, attributes, renames, false);
  }

  return next as T;
};

export {
  applyAttributeRenamesToFilters,
  applyAttributeRenamesToHeaders,
  applyAttributeRenamesToSort,
};
