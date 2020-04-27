import editPageReducer from './containers/EditPage/reducer';
import homePageReducer from './containers/HomePage/reducer';
import pluginId from './pluginId';

const reducers = {
  [`${pluginId}_editPage`]: editPageReducer,
  [`${pluginId}_homePage`]: homePageReducer,
};

export default reducers;
