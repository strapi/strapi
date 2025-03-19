import createDebug from 'debug';

import { DEBUG_NAMESPACE } from './constants';

export const createDebugger = (namespace: string = DEBUG_NAMESPACE) => createDebug(namespace);
