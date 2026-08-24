import { Navigate, useLocation, useMatch } from 'react-router-dom';

import { useAuth } from '../../features/Auth';
import { useEnterprise } from '../../hooks/useEnterprise';
import { useInitQuery } from '../../services/admin';
import { retryDynamicImport } from '../../utils/retryDynamicImport';

import { Login as LoginCE } from './components/Login';
import { AUTH_TYPES, FORMS, FormDictionary, isAuthType } from './constants';
import { getRedirectTo } from './utils';

/* -------------------------------------------------------------------------------------------------
 * AuthPage
 * -----------------------------------------------------------------------------------------------*/

const AuthPage = () => {
  const { search } = useLocation();
  const match = useMatch('/auth/:authType');
  const authType = match?.params.authType;
  const { data } = useInitQuery();
  const { hasAdmin } = data ?? {};
  const Login = useEnterprise(
    LoginCE,
    async () =>
      (
        await retryDynamicImport(
          () => import('../../../../ee/admin/src/pages/AuthPage/components/Login')
        )
      ).LoginEE
  );
  const forms = useEnterprise<FormDictionary, Partial<FormDictionary>>(
    FORMS,
    async () =>
      (await retryDynamicImport(() => import('../../../../ee/admin/src/pages/AuthPage/constants')))
        .FORMS,
    {
      combine(ceForms, eeForms) {
        return {
          ...ceForms,
          ...eeForms,
        };
      },
      defaultValue: FORMS,
    }
  );

  const { token } = useAuth('AuthPage', (auth) => auth);

  if (!isAuthType(authType) || !forms) {
    return <Navigate to="/" />;
  }

  const Component = forms[authType];

  // Redirect the user to the login page if
  // the endpoint does not exists
  if (!Component) {
    return <Navigate to="/" />;
  }

  // User is already logged in
  if (authType !== AUTH_TYPES.REGISTER_ADMIN && authType !== AUTH_TYPES.REGISTER && token) {
    // Honour the `?redirectTo` the user was sent here with, otherwise logging in from a
    // deep link always lands on the home page. `login()` sets the token before the login
    // form gets to navigate, so this branch is what actually performs the redirect.
    // See https://github.com/strapi/strapi/issues/19557
    return <Navigate to={getRedirectTo(search)} />;
  }

  // there is already an admin user oo
  if (hasAdmin && authType === AUTH_TYPES.REGISTER_ADMIN && token) {
    return <Navigate to={getRedirectTo(search)} />;
  }

  // Redirect the user to the register-admin if it is the first user
  if (!hasAdmin && authType !== AUTH_TYPES.REGISTER_ADMIN) {
    return (
      <Navigate
        to={{
          pathname: `/auth/${AUTH_TYPES.REGISTER_ADMIN}`,
          // Forward the `?redirectTo` from /auth/login
          // /abc => /auth/login?redirectTo=%2Fabc => /auth/register-admin?redirectTo=%2Fabc
          search,
        }}
      />
    );
  }

  if (Login && authType === AUTH_TYPES.LOGIN) {
    // Assign the component to render for the login form
    return <Login />;
  } else if (authType === AUTH_TYPES.LOGIN && !Login) {
    // block rendering until the Login EE component is fully loaded
    return null;
  }

  return <Component hasAdmin={hasAdmin} />;
};

export { AuthPage };
