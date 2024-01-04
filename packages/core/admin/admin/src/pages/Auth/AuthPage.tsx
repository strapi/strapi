import { Redirect, useHistory, useRouteMatch } from 'react-router-dom';

import { useAuth } from '../../features/Auth';
import { useEnterprise } from '../../hooks/useEnterprise';

import { Login as LoginCE } from './components/Login';
import { AuthType, FORMS, FormDictionary } from './constants';

/* -------------------------------------------------------------------------------------------------
 * AuthPage
 * -----------------------------------------------------------------------------------------------*/

interface AuthPageProps {
  hasAdmin: boolean;
}

const AuthPage = ({ hasAdmin }: AuthPageProps) => {
  const {
    location: { search },
  } = useHistory();
  const match = useRouteMatch<{ authType: AuthType }>('/auth/:authType');
  const authType = match?.params.authType;
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

  const token = useAuth('AuthPage', (state) => state.token);

  if (!authType || !forms) {
    return <Redirect to="/" />;
  }

  const Component = forms[authType];

  // Redirect the user to the login page if
  // the endpoint does not exist or
  // there is already an admin user oo
  // the user is already logged in
  if (!Component || (hasAdmin && authType === 'register-admin') || token) {
    return <Redirect to="/" />;
  }

  // Redirect the user to the register-admin if it is the first user
  if (!hasAdmin && authType !== 'register-admin') {
    return (
      <Redirect
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
export type { AuthPageProps };
