import formModalReducer from './containers/FormModal/reducer';
import pluginId from './pluginId';

const reducers = {
  [`${pluginId}_formModal`]: formModalReducer,
};

export default reducers;
