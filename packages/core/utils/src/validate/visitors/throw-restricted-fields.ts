import { isArray, isString } from 'lodash/fp';
import type { Visitor } from '../../traverse/factory';
import { throwInvalidParam } from '../utils';

export default (restrictedFields: string[] | null = null): Visitor =>
  ({ key, path: { attribute: path } }) => {
    // all fields
    if (restrictedFields === null) {
      throwInvalidParam({ key });
    }

    // Ignore invalid formats
    if (!isArray(restrictedFields)) {
      return;
    }

    // if an exact match was found
    if (restrictedFields.includes(path as string)) {
      throwInvalidParam({ key });
    }

    // nested matches
    const isRestrictedNested = restrictedFields.some((allowedPath) =>
      path?.toString().startsWith(`${allowedPath}.`)
    );
    if (isRestrictedNested) {
      throwInvalidParam({ key });
    }
  };
