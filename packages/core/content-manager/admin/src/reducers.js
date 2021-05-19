import mainReducer from './pages/Main/reducer';
import editViewLayoutManagerReducer from './pages/EditViewLayoutManager/reducer';
import listViewReducer from './pages/ListView/reducer';
import rbacManagerReducer from './pages/RBACManager/reducer';
import editViewCrudReducer from './sharedReducers/crudReducer/reducer';
import pluginId from './pluginId';

const reducers = {
  [`${pluginId}_main`]: mainReducer,
  [`${pluginId}_listView`]: listViewReducer,
  [`${pluginId}_rbacManager`]: rbacManagerReducer,
  [`${pluginId}_editViewLayoutManager`]: editViewLayoutManagerReducer,
  [`${pluginId}_editViewCrudReducer`]: editViewCrudReducer,
};

export default reducers;
