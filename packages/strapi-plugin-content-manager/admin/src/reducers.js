import mainReducer from './containers/Main/reducer';
import listViewReducer from './containers/ListView/reducer';
import pluginId from './pluginId';

const reducers = {
  [`${pluginId}_main`]: mainReducer,
  [`${pluginId}_listView`]: listViewReducer,
};

export default reducers;
