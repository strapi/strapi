import React, { useEffect, useReducer } from 'react';
import axios from 'axios';
import { camelCase, get, omit, upperFirst, pick } from 'lodash';
import { Redirect, useRouteMatch, useHistory } from 'react-router-dom';
import { auth, useQuery } from 'strapi-helper-plugin';
import { Padded } from '@buffetjs/core';
import PropTypes from 'prop-types';
import BaselineAlignment from '../../components/BaselineAlignement';
import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import PageTitle from '../../components/PageTitle';
import LocaleToggle from '../LocaleToggle';
import checkFormValidity from '../../utils/checkFormValidity';
import formatAPIErrors from '../../utils/formatAPIErrors';
import { forms } from './utils';
import init from './init';
import { initialState, reducer } from './reducer';

const AuthPage = ({ hasAdmin }) => {
  const { push } = useHistory();
  const {
    params: { authType },
  } = useRouteMatch('/auth/:authType');
  const query = useQuery();
  const registrationToken = query.get('registrationToken');
  const { Component, endPoint, fieldsToDisable, fieldsToOmit, inputsPrefix, schema } = get(
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

          dispatch({
            type: 'SET_DATA',
            data: { registrationToken, userInfo: data },
          });
        } catch (err) {
          const errorMessage = get(err, ['response', 'data', 'message'], 'An error occured');

          strapi.notification.error(errorMessage);

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

      strapi.notification.error('notification.error');
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
          data: pick(modifiedData, ['userInfo.email', 'userInfo.firstname']),
        });
      }
      // Redirect to the homePage
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

  // Redirect the user to the login page if the endpoint does not exist
  if (!forms[authType]) {
    return <Redirect to="/" />;
  }

  // Redirect the user to the login page if there is already an admin user
  if (hasAdmin && authType === 'register-admin') {
    return <Redirect to="/" />;
  }

  // Redirect the user to the register-admin if it is the first user
  if (!hasAdmin && authType !== 'register-admin') {
    return <Redirect to="/auth/register-admin" />;
  }

  // Redirect the user to the homepage if he is logged in
  if (auth.getToken()) {
    return <Redirect to="/" />;
  }

  return (
    <>
      <Padded bottom size="md">
        <PageTitle title={upperFirst(authType)} />
        <NavTopRightWrapper>
          <LocaleToggle isLogged className="localeDropdownMenuNotLogged" />
        </NavTopRightWrapper>
        <BaselineAlignment top size="78px">
          <Component
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
    </>
  );
};

AuthPage.defaultProps = {
  hasAdmin: false,
};

AuthPage.propTypes = {
  hasAdmin: PropTypes.bool,
};

export default AuthPage;
