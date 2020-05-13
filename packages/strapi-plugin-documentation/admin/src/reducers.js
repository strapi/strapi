import homePageReducer from './containers/HomePage/reducer';
import pluginId from './pluginId';

const reducers = {
  [`${pluginId}_homePage`]: homePageReducer,
};

export default reducers;
