import type { Struct } from '@strapi/types';
import { isArray, isObject, reject } from 'lodash/fp';
import type { Diff } from '../../../utils/json';
import * as utils from '../../../utils';

const OPTIONAL_CONTENT_TYPES = ['audit-log'] as const;

const isAttributeIgnorable = (diff: Diff) => {
  return (
    diff.path.length === 3 &&
    // Root property must be attributes
    diff.path[0] === 'attributes' &&
    // Need a valid string attribute name
    typeof diff.path[1] === 'string' &&
    // The diff must be on ignorable attribute properties
    ['private', 'required', 'configurable', 'default'].includes(diff.path[2])
  );
};

// TODO: clean up the type checking, which will require cleaning up the typings in utils/json.ts
// exclude admin tables that are not transferable and are optionally available (such as audit logs which are only available in EE)
const isOptionalAdminType = (diff: Diff) => {
  // added/deleted
  if ('value' in diff && isObject(diff.value)) {
    const name = (diff?.value as Struct.ContentTypeSchema)?.info?.singularName;
    return (OPTIONAL_CONTENT_TYPES as ReadonlyArray<string | undefined>).includes(name);
  }

  // modified
  if ('values' in diff && isArray(diff.values) && isObject(diff.values[0])) {
    const name = (diff?.values[0] as Struct.ContentTypeSchema)?.info?.singularName;
    return (OPTIONAL_CONTENT_TYPES as ReadonlyArray<string | undefined>).includes(name);
  }

  return false;
};

const isIgnorableStrict = (diff: Diff) => isAttributeIgnorable(diff) || isOptionalAdminType(diff);

const strategies = {
  // No diffs
  exact(diffs: Diff[]) {
    return diffs;
  },

  // Strict: all content types must match except:
  // - the property within a content type is an ignorable one
  // - those that are (not transferrable and optionally available), for example EE features such as audit logs
  strict(diffs: Diff[]) {
    return reject(isIgnorableStrict, diffs);
  },
};

const compareSchemas = <T, P>(a: T, b: P, strategy: keyof typeof strategies) => {
  const diffs = utils.json.diff(a, b);
  return strategies[strategy](diffs);
};

export { compareSchemas };
