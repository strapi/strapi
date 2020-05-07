import configPageReducer from './containers/ConfigPage/reducer';
import pluginId from './pluginId';

const reducers = {
  [`${pluginId}_configPage`]: configPageReducer,
};

export default reducers;
