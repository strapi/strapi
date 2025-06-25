import { useDispatch, useStore, TypedUseSelectorHook, useSelector } from 'react-redux';

import type { RootState, Store } from './configure';

type AppDispatch = Store['dispatch'];

const useTypedDispatch: () => AppDispatch = useDispatch;
const useTypedStore = useStore as () => Store;
const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;

export { useTypedDispatch, useTypedStore, useTypedSelector };
