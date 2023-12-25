import * as React from 'react';

import { auth, LoadingIndicatorPage, useFetchClient } from '@strapi/helper-plugin';
import Cookies from 'js-cookie';
import { useIntl } from 'react-intl';
import { useHistory, useRouteMatch } from 'react-router-dom';

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

  const { get } = useFetchClient();

  /**
   * TODO: refactor this to use `react-query`
   */
  const fetchUserInfo = React.useCallback(async () => {
    try {
      const jwtToken = Cookies.get('jwtToken');

      auth.clearAppStorage();

      if (jwtToken) {
        auth.setToken(jwtToken, true);
        const requestUrl = '/admin/users/me';
        const {
          data: { data },
        } = await get(requestUrl);

        auth.setUserInfo(data, true);

        Cookies.remove('jwtToken');

        push('/auth/login');
      }
    } catch (e) {
      redirectToOops();
    }
  }, [get, push, redirectToOops]);

  React.useEffect(() => {
    if (match?.params.authResponse === 'error') {
      redirectToOops();
    }

    if (match?.params.authResponse === 'success') {
      fetchUserInfo();
    }
  }, [match, fetchUserInfo, redirectToOops]);

  return <LoadingIndicatorPage />;
};

export { AuthResponse };
