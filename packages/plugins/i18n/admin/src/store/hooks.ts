import { createSelector, Dispatch, Selector } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import { Action, RootState } from './reducers';

type AppDispatch = Dispatch<Action>;

const useTypedDispatch: () => AppDispatch = useDispatch;
const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;

const createTypedSelector = <TResult>(selector: Selector<RootState, TResult>) =>
  createSelector((state: RootState) => state, selector);

export { useTypedSelector, createTypedSelector, useTypedDispatch };
