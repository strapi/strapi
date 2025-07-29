import { reducer as dataManagerProviderReducer } from './components/DataManager/reducer';
import { reducer as formModalReducer } from './components/FormModal/reducer';

export const reducers = {
  [`content-type-builder_formModal`]: formModalReducer,
  [`content-type-builder_dataManagerProvider`]: dataManagerProviderReducer,
};
