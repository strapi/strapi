import { createSelector, Selector } from '@reduxjs/toolkit';
import { useDispatch, useStore, TypedUseSelectorHook, useSelector } from 'react-redux';

import type { RootState, Store } from './configure';

type AppDispatch = Store['dispatch'];

const useTypedDispatch: () => AppDispatch = useDispatch;
const useTypedStore = useStore as () => Store;
const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;

/** Typed selector factory to avoid referencing reselect in emitted .d.ts (pnpm portability) */
const createTypedSelector = <TResult>(
  selector: Selector<RootState, TResult>
): ((state: RootState) => TResult) => createSelector((state: RootState) => state, selector);

export { useTypedDispatch, useTypedStore, useTypedSelector, createTypedSelector };
