import { isArray } from 'lodash/fp';
import type { Visitor } from '../../traverse/factory';

export default (restrictedFields: string[] | null = null): Visitor =>
  ({ key, path: { attribute: path } }, { remove }) => {
    // Remove all fields
    if (restrictedFields === null) {
      remove(key);
      return;
    }

    // Ignore invalid formats
    if (!isArray(restrictedFields)) {
      return;
    }

    // Remove if an exact match was found
    if (restrictedFields.includes(path as string)) {
      remove(key);
      return;
    }

    // Remove nested matches
    const isRestrictedNested = restrictedFields.some((allowedPath) =>
      path?.toString().startsWith(`${allowedPath}.`)
    );
    if (isRestrictedNested) {
      remove(key);
    }
  };
