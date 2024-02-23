import { useEffect } from 'react';

import { Reducer } from '@reduxjs/toolkit';

import { useTypedStore } from '../core/store/hooks';

/**
 * @public
 * @description Inject a new reducer into the global redux-store.
 * @example
 * ```tsx
 * import { reducer } from './local-store';
 *
 * const MyPlugin = () => {
 *  useInjectReducer("plugin", reducer);
 * }
 * ```
 */
export function useInjectReducer(namespace: string, reducer: Reducer) {
  const store = useTypedStore();

  useEffect(() => {
    store.injectReducer(namespace, reducer);
  }, [store, namespace, reducer]);
}
