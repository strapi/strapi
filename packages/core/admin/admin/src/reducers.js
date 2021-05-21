import globalReducer from './pages/App/reducer';
import languageProviderReducer from './components/LanguageProvider/reducer';
import menuReducer from './components/LeftMenu/reducer';
import permissionsManagerReducer from './components/PermissionsManager/reducer';
import rbacProviderReducer from './components/RBACProvider/reducer';

const reducers = {
  app: globalReducer,
  language: languageProviderReducer,
  menu: menuReducer,
  permissionsManager: permissionsManagerReducer,
  rbacProvider: rbacProviderReducer,
};

export default reducers;
