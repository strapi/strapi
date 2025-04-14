import createDebug, { type Debugger } from 'debug';

import { DEBUG_NAMESPACE } from '../constants';

/**
 * Create a new {@link Debugger} instance for the given `section`.
 *
 * By default, the namespace is prefixed with `strapi:core:openapi`, but this can be customized using the `namespace` parameter
 */
export const createDebugger = (
  section: string | null = null,
  namespace: string = DEBUG_NAMESPACE
) => {
  return section !== null ? createDebug(`${namespace}:${section}`) : createDebug(namespace);
};
