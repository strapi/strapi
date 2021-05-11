import initializerReducer from './containers/Initializer/reducer';
import pluginId from './pluginId';

const reducers = {
  [`${pluginId}_fileModel`]: initializerReducer,
};

export default reducers;
