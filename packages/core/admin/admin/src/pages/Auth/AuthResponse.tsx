import * as React from 'react';

import { useIntl } from 'react-intl';
import { useNavigate, useMatch } from 'react-router-dom';

import { Page } from '../../components/PageHelpers';
import { useTypedDispatch } from '../../core/store/hooks';
import { login } from '../../reducer';
import { getCookieValue, deleteCookie } from '../../utils/cookies';

const AuthResponse = () => {
  const match = useMatch('/openid/:authResponse');
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const dispatch = useTypedDispatch();

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

  React.useEffect(() => {
    if (!match || match?.params.authResponse === 'error') {
      redirectToOops();
    }

    if (match?.params.authResponse === 'success') {
      const jwtToken = getCookieValue('jwtToken');

      if (jwtToken) {
        dispatch(
          login({
            token: jwtToken,
            persist: true,
          })
        );

        deleteCookie('jwtToken');

        navigate('/auth/login');
      } else {
        redirectToOops();
      }
    }
  }, [dispatch, match, redirectToOops, navigate]);

  return <Page.Loading />;
};

export { AuthResponse };
