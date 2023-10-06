import dataManagerProvider from './components/DataManagerProvider/reducer';
import formModalReducer from './components/FormModal/reducer';
import pluginId from './pluginId';

export const reducers = {
  [`${pluginId}_formModal`]: formModalReducer,
  [`${pluginId}_dataManagerProvider`]: dataManagerProvider,
};
