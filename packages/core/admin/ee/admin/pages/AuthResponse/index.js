import React, { useEffect, useRef, useCallback } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { useIntl } from 'react-intl';
import Cookies from 'js-cookie';
import { auth, LoadingIndicatorPage, request } from '@strapi/helper-plugin';
import { getRequestUrl } from '../../../../admin/src/utils';

const AuthResponse = () => {
  const {
    params: { authResponse },
  } = useRouteMatch('/auth/login/:authResponse');
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const formatMessageRef = useRef(formatMessage);

  let redirectToOops = useCallback(() => {
    push(
      `/auth/oops?info=${encodeURIComponent(
        formatMessageRef.current({
          id: 'Auth.form.button.login.providers.error',
          defaultMessage: 'We cannot connect you through the selected provider.',
        })
      )}`
    );
  }, [push]);

  const fetchUserInfo = useCallback(async () => {
    try {
      const jwtToken = Cookies.get('jwtToken');

      auth.clearAppStorage();

      if (jwtToken) {
        auth.setToken(jwtToken, true);
        const requestUrl = getRequestUrl('users/me');
        const { data } = await request(requestUrl, { method: 'GET' });

        auth.setUserInfo(data, true);

        Cookies.remove('jwtToken');

        push('/auth/login');
      }
    } catch (e) {
      redirectToOops();
    }
  }, [push, redirectToOops]);

  useEffect(() => {
    if (authResponse === 'error') {
      redirectToOops();
    }

    if (authResponse === 'success') {
      fetchUserInfo();
    }
  }, [authResponse, fetchUserInfo, redirectToOops]);

  return <LoadingIndicatorPage />;
};

export default AuthResponse;
