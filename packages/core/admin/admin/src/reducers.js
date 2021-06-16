import menuReducer from './hooks/useMenu/reducer';
import rbacProviderReducer from './components/RBACProvider/reducer';

const reducers = {
  menu: menuReducer,
  rbacProvider: rbacProviderReducer,
};

export default reducers;
