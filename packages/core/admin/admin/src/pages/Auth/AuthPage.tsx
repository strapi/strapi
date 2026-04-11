import { Navigate, useLocation, useMatch } from 'react-router-dom';

import { useAuth } from '../../features/Auth';
import { useEnterprise } from '../../hooks/useEnterprise';
import { useInitQuery } from '../../services/admin';

import { Login as LoginCE } from './components/Login';
import { FORMS, FormDictionary } from './constants';

/* -------------------------------------------------------------------------------------------------
 * AuthPage
 * -----------------------------------------------------------------------------------------------*/

const AuthPage = () => {
  const { search } = useLocation();
  const match = useMatch('/auth/:authType');
  const authType = match?.params.authType;
  const { data } = useInitQuery();
  const { hasAdmin, registerEnabled = true } = data ?? {};
  const Login = useEnterprise(
    LoginCE,
    async () => (await import('../../../../ee/admin/src/pages/AuthPage/components/Login')).LoginEE
  );
  const forms = useEnterprise<FormDictionary, Partial<FormDictionary>>(
    FORMS,
    async () => (await import('../../../../ee/admin/src/pages/AuthPage/constants')).FORMS,
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

  if (!authType || !forms) {
    return <Navigate to="/" />;
  }

  const Component = forms[authType as keyof FormDictionary];

  // Redirect the user to the login page if the endpoint does not exist
  if (!Component) {
    return <Navigate to="/" />;
  }

  // If register-admin is the requested page but self-registration is disabled,
  // send the user to /auth/login regardless of whether an admin exists.
  if (authType === 'register-admin' && !registerEnabled) {
    return <Navigate to="/auth/login" />;
  }

  // User is already logged in
  if (authType !== 'register-admin' && authType !== 'register' && token) {
    return <Navigate to="/" />;
  }

  // there is already an admin user oo
  if (hasAdmin && authType === 'register-admin' && token) {
    return <Navigate to="/" />;
  }

  // Redirect the user to the register-admin if it is the first user
  // AND self-registration is enabled. Otherwise leave them on whichever
  // auth page they requested (typically /auth/login).
  if (!hasAdmin && authType !== 'register-admin' && registerEnabled) {
    return (
      <Navigate
        to={{
          pathname: '/auth/register-admin',
          // Forward the `?redirectTo` from /auth/login
          // /abc => /auth/login?redirectTo=%2Fabc => /auth/register-admin?redirectTo=%2Fabc
          search,
        }}
      />
    );
  }

  if (Login && authType === 'login') {
    // Assign the component to render for the login form
    return <Login />;
  } else if (authType === 'login' && !Login) {
    // block rendering until the Login EE component is fully loaded
    return null;
  }

  return <Component hasAdmin={hasAdmin} />;
};

export { AuthPage };
