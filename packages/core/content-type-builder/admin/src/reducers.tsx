import dataManagerProvider from './components/DataManagerProvider/reducer';
import formModalReducer from './components/FormModal/reducer.ts';
import pluginId from './pluginId';

const reducers = {
  [`${pluginId}_formModal`]: formModalReducer,
  [`${pluginId}_dataManagerProvider`]: dataManagerProvider,
};

export default reducers;
