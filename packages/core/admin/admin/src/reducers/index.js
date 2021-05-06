import globalReducer from '../containers/App/reducer';
import adminReducer from '../containers/Admin/reducer';
import languageProviderReducer from '../containers/LanguageProvider/reducer';
import permissionsManagerReducer from '../containers/PermissionsManager/reducer';
import menuReducer from '../containers/LeftMenu/reducer';

// TODO move containers reducers into this folder

const reducers = {
  app: globalReducer,
  admin: adminReducer,
  language: languageProviderReducer,
  permissionsManager: permissionsManagerReducer,
  menu: menuReducer,
};

export default reducers;
