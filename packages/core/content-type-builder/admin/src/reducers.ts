import { reducer } from './components/DataManagerProvider/reducer';
import { reducer as formModalReducer } from './components/FormModal/reducer';
import { pluginId } from './pluginId';

export const reducers = {
  [`${pluginId}_formModal`]: formModalReducer,
  [`${pluginId}_dataManagerProvider`]: reducer,
};
