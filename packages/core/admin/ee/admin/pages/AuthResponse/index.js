import React, { useCallback, useEffect, useRef } from 'react';

import { auth, LoadingIndicatorPage, useFetchClient } from '@strapi/helper-plugin';
import Cookies from 'js-cookie';
import { useIntl } from 'react-intl';
import { useNavigate, useMatch } from 'react-router-dom';

export const AuthResponse = () => {
  const {
    params: { authResponse },
  } = useMatch('/auth/login/:authResponse');
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const formatMessageRef = useRef(formatMessage);

  let redirectToOops = useCallback(() => {
    navigate(
      `/auth/oops?info=${encodeURIComponent(
        formatMessageRef.current({
          id: 'Auth.form.button.login.providers.error',
          defaultMessage: 'We cannot connect you through the selected provider.',
        })
      )}`
    );
  }, [navigate]);

  const { get } = useFetchClient();

  const fetchUserInfo = useCallback(async () => {
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

        navigate('/auth/login');
      }
    } catch (e) {
      redirectToOops();
    }
  }, [get, navigate, redirectToOops]);

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
