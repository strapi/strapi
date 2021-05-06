import globalReducer from '../pages/App/reducer';
import adminReducer from '../pages/Admin/reducer';
import languageProviderReducer from '../components/LanguageProvider/reducer';
import permissionsManagerReducer from '../components/PermissionsManager/reducer';
import menuReducer from '../components/LeftMenu/reducer';

const reducers = {
  app: globalReducer,
  admin: adminReducer,
  language: languageProviderReducer,
  permissionsManager: permissionsManagerReducer,
  menu: menuReducer,
};

export default reducers;
