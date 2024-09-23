import { isArray, isString } from 'lodash/fp';
import type { Visitor } from '../../traverse/factory';
import { throwInvalidKey } from '../utils';

export default (restrictedFields: string[] | null = null): Visitor =>
  ({ key, path: { attribute: path } }) => {
    // all fields
    if (restrictedFields === null) {
      throwInvalidKey({ key, path });
    }

    // Throw on invalid formats
    if (!(isArray(restrictedFields) && restrictedFields.every(isString))) {
      throw new TypeError(
        `Expected array of strings for restrictedFields but got "${typeof restrictedFields}"`
      );
    }

    // if an exact match was found
    if (restrictedFields.includes(path as string)) {
      throwInvalidKey({ key, path });
    }

    // nested matches
    const isRestrictedNested = restrictedFields.some((allowedPath) =>
      path?.toString().startsWith(`${allowedPath}.`)
    );
    if (isRestrictedNested) {
      throwInvalidKey({ key, path });
    }
  };
