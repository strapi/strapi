import globalReducer from './pages/App/reducer';
import languageProviderReducer from './components/LanguageProvider/reducer';
import menuReducer from './components/LeftMenu/reducer';
import rbacProviderReducer from './components/RBACProvider/reducer';

const reducers = {
  app: globalReducer,
  language: languageProviderReducer,
  menu: menuReducer,

  rbacProvider: rbacProviderReducer,
};

export default reducers;
