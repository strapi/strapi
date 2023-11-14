import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';

import type { Dispatch, RootState } from './store';

export const useTypedDispatch: () => Dispatch = useDispatch;
export const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;
