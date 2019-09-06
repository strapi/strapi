import React, { memo, useReducer } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { upperFirst } from 'lodash';
import { Link, Redirect } from 'react-router-dom';
import { Button, getYupInnerErrors } from 'strapi-helper-plugin';
import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import LogoStrapi from '../../assets/images/logo_strapi.png';
import PageTitle from '../../components/PageTitle';
import LocaleToggle from '../LocaleToggle';
import Wrapper from './Wrapper';
import Input from './Input';
import forms from './forms';
import reducer, { initialState } from './reducer';

const AuthPage = ({
  match: {
    params: { authType },
  },
}) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const { modifiedData } = reducerState.toJS();
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
    let errors = {};

    try {
      await schema.validate(modifiedData, { abortEarly: false });
    } catch (err) {
      errors = getYupInnerErrors(err);
    }

    dispatch({
      type: 'SET_ERRORS',
      errors,
    });
  };

  // Redirect the user to the login page
  if (!Object.keys(forms).includes(authType)) {
    return <Redirect to="/" />;
  }

  // TODO Remove temporary
  const hasErrors = false;

  return (
    <>
      <PageTitle title={upperFirst(authType)} />
      <Wrapper>
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
                {/* TODO ERROR CONTAINER */}
                {hasErrors && (
                  <div className="errorsContainer">
                    {/* TODO DISPLAY ERRORS */}
                  </div>
                )}
                <div className="row" style={{ textAlign: 'start' }}>
                  {forms[authType].inputs.map(row => {
                    return row.map(input => {
                      return (
                        <Input
                          {...input}
                          key={input.name}
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
                      type="submit"
                      label="Auth.form.button.login"
                      primary
                      style={
                        authType === 'forgot-password' ? { width: '100%' } : {}
                      }
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
  match: PropTypes.shape({
    params: PropTypes.shape({
      authType: PropTypes.string,
    }),
  }),
};

export default memo(AuthPage);
