import { isArray } from 'lodash/fp';
import type { Visitor } from '../../traverse/factory';
import { ValidationError } from '../../errors';

export default (restrictedFields: string[] | null = null): Visitor =>
  ({ key, path: { attribute: path } }) => {
    // Remove all fields
    if (restrictedFields === null) {
      throw new ValidationError(`Invalid parameter ${key}`);
    }

    // Ignore invalid formats
    if (!isArray(restrictedFields)) {
      return;
    }

    // Remove if an exact match was found
    if (restrictedFields.includes(path as string)) {
      throw new ValidationError(`Invalid parameter ${key}`);
    }

    // Remove nested matches
    const isRestrictedNested = restrictedFields.some((allowedPath) =>
      path?.toString().startsWith(`${allowedPath}.`)
    );
    if (isRestrictedNested) {
      throw new ValidationError(`Invalid parameter ${key}`);
    }
  };
