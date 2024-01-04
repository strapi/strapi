import * as React from 'react';

import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import Cookies from 'js-cookie';
import { useIntl } from 'react-intl';
import { useHistory, useRouteMatch } from 'react-router-dom';

import { useAuth } from '../../../../admin/src/features/Auth';

const AuthResponse = () => {
  const match = useRouteMatch<{ authResponse: string }>('/auth/login/:authResponse');
  const { formatMessage } = useIntl();
  const { push } = useHistory();

  const redirectToOops = React.useCallback(() => {
    push(
      `/auth/oops?info=${encodeURIComponent(
        formatMessage({
          id: 'Auth.form.button.login.providers.error',
          defaultMessage: 'We cannot connect you through the selected provider.',
        })
      )}`
    );
  }, [push, formatMessage]);

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

        push('/auth/login');
      } else {
        redirectToOops();
      }
    }
  }, [match, redirectToOops, setToken, push]);

  return <LoadingIndicatorPage />;
};

export { AuthResponse };
