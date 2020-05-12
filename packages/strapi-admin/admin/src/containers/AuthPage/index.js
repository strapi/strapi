import React, { memo, useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty, omit, set, upperFirst } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { Link, Redirect } from 'react-router-dom';
import {
  auth,
  Button,
  getQueryParameters,
  getYupInnerErrors,
  request,
} from 'strapi-helper-plugin';
import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import LogoStrapi from '../../assets/images/logo_strapi.png';
import PageTitle from '../../components/PageTitle';
import LocaleToggle from '../LocaleToggle';
import Wrapper from './Wrapper';
import Input from './Input';
import forms from './forms';
import reducer, { initialState } from './reducer';
import formatErrorFromRequest from './utils/formatErrorFromRequest';

const AuthPage = ({
  hasAdminUser,
  location: { search },
  match: {
    params: { authType },
  },
}) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const codeRef = useRef();
  const aborController = new AbortController();

  const { signal } = aborController;
  codeRef.current = getQueryParameters(search, 'code');
  useEffect(() => {
    // Set the reset code provided by the url
    if (authType === 'reset-password') {
      dispatch({
        type: 'ON_CHANGE',
        keys: ['code'],
        value: codeRef.current,
      });
    } else {
      // Clean reducer upon navigation
      dispatch({
        type: 'RESET_PROPS',
      });
    }

    return () => {
      aborController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authType, codeRef]);
  const {
    didCheckErrors,
    errors,
    modifiedData,
    submitSuccess,
    userEmail,
  } = reducerState.toJS();
  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value,
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const schema = forms[authType].schema;
    let formErrors = {};

    try {
      await schema.validate(modifiedData, { abortEarly: false });

      try {
        if (modifiedData.news === true) {
          await request('https://analytics.strapi.io/register', {
            method: 'POST',
            body: omit(modifiedData, ['password', 'confirmPassword']),
            signal,
          });
        }
      } catch (err) {
        // Do nothing
      }

      try {
        const requestEndPoint = forms[authType].endPoint;
        const requestURL = `/admin/auth/${requestEndPoint}`;
        const body = omit(modifiedData, 'news');

        if (authType === 'forgot-password') {
          set(body, 'url', `${strapi.remoteURL}/auth/reset-password`);
        }

        const { jwt, user, ok } = await request(requestURL, {
          method: 'POST',
          body,
          signal,
        });

        if (authType === 'forgot-password' && ok === true) {
          dispatch({
            type: 'SUBMIT_SUCCESS',
            email: modifiedData.email,
          });
        } else {
          auth.setToken(jwt, modifiedData.rememberMe);
          auth.setUserInfo(user, modifiedData.rememberMe);
        }
      } catch (err) {
        const formattedError = formatErrorFromRequest(err);

        if (authType === 'login') {
          formErrors = {
            global: formattedError,
            identifier: formattedError,
            password: formattedError,
          };
        } else if (authType === 'forgot-password') {
          formErrors = { email: formattedError[0] };
        } else {
          strapi.notification.error(
            get(formattedError, '0.id', 'notification.error')
          );
        }
      }
    } catch (err) {
      formErrors = getYupInnerErrors(err);
    }

    dispatch({
      type: 'SET_ERRORS',
      formErrors,
    });
  };

  // Redirect the user to the login page if the endpoint does not exist
  if (!Object.keys(forms).includes(authType)) {
    return <Redirect to="/" />;
  }

  // Redirect the user to the homepage if he is logged in
  if (auth.getToken()) {
    return <Redirect to="/" />;
  }

  if (!hasAdminUser && authType !== 'register') {
    return <Redirect to="/auth/register" />;
  }

  // Prevent the user from registering to the admin
  if (hasAdminUser && authType === 'register') {
    return <Redirect to="/auth/login" />;
  }

  const globalError = get(errors, 'global.0.id', '');
  const shouldShowFormErrors = !isEmpty(globalError);

  return (
    <>
      <PageTitle title={upperFirst(authType)} />
      <Wrapper authType={authType} withSucessBorder={submitSuccess}>
        <NavTopRightWrapper>
          <LocaleToggle isLogged className="localeDropdownMenuNotLogged" />
        </NavTopRightWrapper>
        <div className="wrapper">
          <div className="headerContainer">
            {authType === 'register' ? (
              <FormattedMessage id="Auth.form.header.register" />
            ) : (
              <img src={LogoStrapi} alt="strapi-logo" />
            )}
          </div>
          <div className="headerDescription">
            {authType === 'register' && (
              <FormattedMessage id="Auth.header.register.description" />
            )}
          </div>
          {/* TODO Forgot success style */}
          <div className="formContainer bordered">
            <form onSubmit={handleSubmit}>
              <div className="container-fluid">
                {shouldShowFormErrors && (
                  <div className="errorsContainer">
                    <FormattedMessage id={globalError} />
                  </div>
                )}
                <div className="row" style={{ textAlign: 'start' }}>
                  {submitSuccess && (
                    <div className="forgotSuccess">
                      <FormattedMessage id="Auth.form.forgot-password.email.label.success" />
                      <br />
                      <p>{userEmail}</p>
                    </div>
                  )}
                  {!submitSuccess &&
                    forms[authType].inputs.map((row, index) => {
                      return row.map(input => {
                        return (
                          <Input
                            {...input}
                            autoFocus={index === 0}
                            didCheckErrors={didCheckErrors}
                            errors={errors}
                            key={input.name}
                            noErrorsDescription={shouldShowFormErrors}
                            onChange={handleChange}
                            value={modifiedData[input.name]}
                          />
                        );
                      });
                    })}
                  <div
                    className={`${
                      authType === 'login'
                        ? 'col-6 loginButton'
                        : 'col-12 buttonContainer'
                    }`}
                  >
                    <Button
                      className={submitSuccess ? 'buttonForgotSuccess' : ''}
                      type="submit"
                      label={`Auth.form.button.${
                        submitSuccess ? 'forgot-password.success' : authType
                      }`}
                      primary={!submitSuccess}
                      style={authType === 'login' ? {} : { width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="linkContainer">
            {authType !== 'register' && authType !== 'reset-password' && (
              <Link
                to={`/auth/${
                  authType === 'login' ? 'forgot-password' : 'login'
                }`}
              >
                <FormattedMessage
                  id={`Auth.link.${
                    authType === 'login' ? 'forgot-password' : 'ready'
                  }`}
                />
              </Link>
            )}
          </div>
          {authType === 'register' && (
            <div className="logoContainer">
              <img src={LogoStrapi} alt="strapi-logo" />
            </div>
          )}
        </div>
      </Wrapper>
    </>
  );
};

AuthPage.propTypes = {
  hasAdminUser: PropTypes.bool.isRequired,
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }).isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      authType: PropTypes.string,
    }).isRequired,
  }).isRequired,
};

export default memo(AuthPage);
