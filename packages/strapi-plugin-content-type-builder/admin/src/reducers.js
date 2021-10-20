import formModalReducer from './containers/FormModal/reducer';
import dataManagerProvider from './containers/DataManagerProvider/reducer';
import pluginId from './pluginId';

const reducers = {
  [`${pluginId}_formModal`]: formModalReducer,
  [`${pluginId}_dataManagerProvider`]: dataManagerProvider,
};

export default reducers;
