import * as React from 'react';

import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import Cookies from 'js-cookie';
import { useIntl } from 'react-intl';
import { useNavigate, useMatch } from 'react-router-dom';

import { useAuth } from '../../../../admin/src/features/Auth';

const AuthResponse = () => {
  const match = useMatch('/auth/login/:authResponse');
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const redirectToOops = React.useCallback(() => {
    navigate({
      pathname: '/auth/oops',
      search: `?info=${encodeURIComponent(
        formatMessage({
          id: 'Auth.form.button.login.providers.error',
          defaultMessage: 'We cannot connect you through the selected provider.',
        })
      )}`,
    });
  }, [navigate, formatMessage]);

  const setToken = useAuth('AuthResponse', (state) => state.setToken);

  React.useEffect(() => {
    if (match?.params.authResponse === 'error') {
      redirectToOops();
    }

    if (match?.params.authResponse === 'success') {
      const jwtToken = Cookies.get('jwtToken');

      if (jwtToken) {
        setToken(jwtToken);

        Cookies.remove('jwtToken');

        navigate('/auth/login');
      } else {
        redirectToOops();
      }
    }
  }, [match, redirectToOops, setToken, navigate]);

  return <LoadingIndicatorPage />;
};

export { AuthResponse };
