import appReducer from './pages/App/reducer';
import rbacProviderReducer from './components/RBACProvider/reducer';
import cmAppReducer from './content-manager/pages/App/reducer';
import editViewLayoutManagerReducer from './content-manager/pages/EditViewLayoutManager/reducer';
import listViewReducer from './content-manager/pages/ListView/reducer';
import rbacManagerReducer from './content-manager/hooks/useSyncRbac/reducer';
import editViewCrudReducer from './content-manager/sharedReducers/crudReducer/reducer';

const contentManagerReducers = {
  'content-manager_app': cmAppReducer,
  'content-manager_listView': listViewReducer,
  'content-manager_rbacManager': rbacManagerReducer,
  'content-manager_editViewLayoutManager': editViewLayoutManagerReducer,
  'content-manager_editViewCrudReducer': editViewCrudReducer,
};

const reducers = {
  admin_app: appReducer,
  rbacProvider: rbacProviderReducer,
  ...contentManagerReducers,
};

export default reducers;
