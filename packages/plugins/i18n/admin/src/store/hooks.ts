import { createSelector, Dispatch, Selector } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import { Action, RootState } from './reducers';

type AppDispatch = Dispatch<Action>;

const useTypedDispatch: () => AppDispatch = useDispatch;
const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;

const createTypedSelector = <TResult, TSelector extends Selector<RootState, TResult>>(
  selector: TSelector
  // @ts-expect-error – TODO: this is needed to avoid TS2742. But it's not quite right.
): ReturnType<TSelector> => createSelector((state: RootState) => state, selector);

export { useTypedSelector, createTypedSelector, useTypedDispatch };
