import { Dispatch } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import { Action, RootState } from './reducers';

type AppDispatch = Dispatch<Action>;

const useTypedDispatch: () => AppDispatch = useDispatch;
const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;

export { useTypedSelector, useTypedDispatch };
