import globalReducer from './pages/App/reducer';
import adminReducer from './pages/Admin/reducer';
import languageProviderReducer from './components/LanguageProvider/reducer';
import menuReducer from './components/LeftMenu/reducer';
import permissionsManagerReducer from './components/PermissionsManager/reducer';
import rbacProviderReducer from './components/RBACProvider/reducer';

const reducers = {
  admin: adminReducer,
  app: globalReducer,
  language: languageProviderReducer,
  menu: menuReducer,
  permissionsManager: permissionsManagerReducer,
  rbacProvider: rbacProviderReducer,
};

export default reducers;
