import React, { useEffect, useReducer } from 'react';
import axios from 'axios';
import { camelCase, get, omit, upperFirst } from 'lodash';
import { Redirect, useRouteMatch, useHistory } from 'react-router-dom';
import { BaselineAlignment, auth, useQuery } from 'strapi-helper-plugin';
import { Padded } from '@buffetjs/core';
import PropTypes from 'prop-types';
import forms from 'ee_else_ce/containers/AuthPage/utils/forms';

import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import PageTitle from '../../components/PageTitle';
import LocaleToggle from '../LocaleToggle';
import checkFormValidity from '../../utils/checkFormValidity';
import formatAPIErrors from '../../utils/formatAPIErrors';
import init from './init';
import { initialState, reducer } from './reducer';
import useChangeLanguage from '../LanguageProvider/hooks/useChangeLanguage';

const AuthPage = ({ hasAdmin, setHasAdmin }) => {
  const { push } = useHistory();
  const changeLocale = useChangeLanguage();
  const {
    params: { authType },
  } = useRouteMatch('/auth/:authType');
  const query = useQuery();
  const registrationToken = query.get('registrationToken');
  const { Component, endPoint, fieldsToDisable, fieldsToOmit, inputsPrefix, schema, ...rest } = get(
    forms,
    authType,
    {}
  );
  const [{ formErrors, modifiedData, requestError }, dispatch] = useReducer(
    reducer,
    initialState,
    init
  );
  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();

  useEffect(() => {
    // Cancel request on unmount
    return () => {
      source.cancel('Component unmounted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the state on navigation change
  useEffect(() => {
    dispatch({
      type: 'RESET_PROPS',
    });
  }, [authType]);

  useEffect(() => {
    if (authType === 'register') {
      const getData = async () => {
        try {
          const {
            data: { data },
          } = await axios.get(
            `${strapi.backendURL}/admin/registration-info?registrationToken=${registrationToken}`
          );

          if (data) {
            dispatch({
              type: 'SET_DATA',
              data: { registrationToken, userInfo: data },
            });
          }
        } catch (err) {
          const errorMessage = get(err, ['response', 'data', 'message'], 'An error occurred');

          strapi.notification.toggle({
            type: 'warning',
            message: errorMessage,
          });

          // Redirect to the oops page in case of an invalid token
          // @alexandrebodin @JAB I am not sure it is the wanted behavior
          push(`/auth/oops?info=${encodeURIComponent(errorMessage)}`);
        }
      };

      getData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authType]);

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();

    dispatch({
      type: 'SET_ERRORS',
      errors: {},
    });

    const errors = await checkFormValidity(modifiedData, schema);

    dispatch({
      type: 'SET_ERRORS',
      errors: errors || {},
    });

    if (!errors) {
      const body = omit(modifiedData, fieldsToOmit);
      const requestURL = `/admin/${endPoint}`;

      if (authType === 'login') {
        await loginRequest(body, requestURL);
      }

      if (authType === 'register' || authType === 'register-admin') {
        await registerRequest(body, requestURL);
      }

      if (authType === 'forgot-password') {
        await forgotPasswordRequest(body, requestURL);
      }

      if (authType === 'reset-password') {
        await resetPasswordRequest(body, requestURL);
      }
    }
  };

  const forgotPasswordRequest = async (body, requestURL) => {
    try {
      await axios({
        method: 'POST',
        url: `${strapi.backendURL}${requestURL}`,
        data: body,
        cancelToken: source.token,
      });

      push('/auth/forgot-password-success');
    } catch (err) {
      console.error(err);

      strapi.notification.toggle({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    }
  };

  const loginRequest = async (body, requestURL) => {
    try {
      const {
        data: {
          data: { token, user },
        },
      } = await axios({
        method: 'POST',
        url: `${strapi.backendURL}${requestURL}`,
        data: body,
        cancelToken: source.token,
      });

      if (user.preferedLanguage) {
        changeLocale(user.preferedLanguage);
      }

      auth.setToken(token, modifiedData.rememberMe);
      auth.setUserInfo(user, modifiedData.rememberMe);

      push('/');
    } catch (err) {
      if (err.response) {
        const errorMessage = get(err, ['response', 'data', 'message'], 'Something went wrong');
        const errorStatus = get(err, ['response', 'data', 'statusCode'], 400);

        if (camelCase(errorMessage).toLowerCase() === 'usernotactive') {
          push('/auth/oops');

          dispatch({
            type: 'RESET_PROPS',
          });

          return;
        }

        dispatch({
          type: 'SET_REQUEST_ERROR',
          errorMessage,
          errorStatus,
        });
      }
    }
  };

  const registerRequest = async (body, requestURL) => {
    try {
      const {
        data: {
          data: { token, user },
        },
      } = await axios({
        method: 'POST',
        url: `${strapi.backendURL}${requestURL}`,
        data: body,
        cancelToken: source.token,
      });

      auth.setToken(token, false);
      auth.setUserInfo(user, false);

      if (
        (authType === 'register' && modifiedData.userInfo.news === true) ||
        (authType === 'register-admin' && modifiedData.news === true)
      ) {
        axios({
          method: 'POST',
          url: 'https://analytics.strapi.io/register',
          data: {
            email: user.email,
            username: user.firstname,
          },
        });
      }
      // Redirect to the homePage
      setHasAdmin(true);
      push('/');
    } catch (err) {
      if (err.response) {
        const { data } = err.response;
        const apiErrors = formatAPIErrors(data);

        dispatch({
          type: 'SET_ERRORS',
          errors: apiErrors,
        });
      }
    }
  };

  const resetPasswordRequest = async (body, requestURL) => {
    try {
      const {
        data: {
          data: { token, user },
        },
      } = await axios({
        method: 'POST',
        url: `${strapi.backendURL}${requestURL}`,
        data: { ...body, resetPasswordToken: query.get('code') },
        cancelToken: source.token,
      });

      auth.setToken(token, false);
      auth.setUserInfo(user, false);

      // Redirect to the homePage
      push('/');
    } catch (err) {
      if (err.response) {
        const errorMessage = get(err, ['response', 'data', 'message'], 'Something went wrong');
        const errorStatus = get(err, ['response', 'data', 'statusCode'], 400);

        dispatch({
          type: 'SET_REQUEST_ERROR',
          errorMessage,
          errorStatus,
        });
      }
    }
  };

  // Redirect the user to the login page if
  // the endpoint does not exist or
  // there is already an admin user oo
  // the user is already logged in
  if (!forms[authType] || (hasAdmin && authType === 'register-admin') || auth.getToken()) {
    return <Redirect to="/" />;
  }

  // Redirect the user to the register-admin if it is the first user
  if (!hasAdmin && authType !== 'register-admin') {
    return <Redirect to="/auth/register-admin" />;
  }

  return (
    <Padded bottom size="md">
      <PageTitle title={upperFirst(authType)} />
      <NavTopRightWrapper>
        <LocaleToggle isLogged className="localeDropdownMenuNotLogged" />
      </NavTopRightWrapper>
      <BaselineAlignment top size="78px">
        <Component
          {...rest}
          fieldsToDisable={fieldsToDisable}
          formErrors={formErrors}
          inputsPrefix={inputsPrefix}
          modifiedData={modifiedData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          requestError={requestError}
        />
      </BaselineAlignment>
    </Padded>
  );
};

AuthPage.defaultProps = {
  hasAdmin: false,
};

AuthPage.propTypes = {
  hasAdmin: PropTypes.bool,
  setHasAdmin: PropTypes.func.isRequired,
};

export default AuthPage;
