import createDebug from 'debug';

import { DEBUG_NAMESPACE } from '../constants';

export const createDebugger = (
  section: string | null = null,
  namespace: string = DEBUG_NAMESPACE
) => {
  return section !== null ? createDebug(`${namespace}:${section}`) : createDebug(namespace);
};
