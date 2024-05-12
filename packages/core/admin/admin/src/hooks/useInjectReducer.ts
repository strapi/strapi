import { useEffect } from 'react';

import { Reducer } from '@reduxjs/toolkit';

import { useTypedStore } from '../core/store/hooks';

/**
 * Inject a new reducer into the global redux-store.
 *
 * @export
 * @param {string} namespace - Store namespace of the injected reducer
 * @param {Function} reducer - Reducer function
 * @return void
 */

export function useInjectReducer(namespace: string, reducer: Reducer) {
  const store = useTypedStore();

  useEffect(() => {
    store.injectReducer(namespace, reducer);
  }, [store, namespace, reducer]);
}
