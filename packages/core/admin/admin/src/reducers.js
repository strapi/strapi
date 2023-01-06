import appReducer from './pages/App/reducer';
import rbacProviderReducer from './components/RBACProvider/reducer';

const reducers = {
  admin_app: appReducer,
  rbacProvider: rbacProviderReducer,
};

export default reducers;
