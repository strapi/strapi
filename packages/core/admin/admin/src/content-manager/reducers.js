import appReducer from './pages/App/reducer';
import editViewLayoutManagerReducer from './pages/EditViewLayoutManager/reducer';
import listViewReducer from './pages/ListView/reducer';
import rbacManagerReducer from './hooks/useSyncRbac/reducer';
import editViewCrudReducer from './sharedReducers/crudReducer/reducer';
import pluginId from './pluginId';

const reducers = {
  [`${pluginId}_app`]: appReducer,
  [`${pluginId}_listView`]: listViewReducer,
  [`${pluginId}_rbacManager`]: rbacManagerReducer,
  [`${pluginId}_editViewLayoutManager`]: editViewLayoutManagerReducer,
  [`${pluginId}_editViewCrudReducer`]: editViewCrudReducer,
};

export default reducers;
