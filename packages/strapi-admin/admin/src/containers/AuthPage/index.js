import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { upperFirst } from 'lodash';
import { Redirect } from 'react-router-dom';
// import { auth, Button, InputsIndex as Input } from 'strapi-helper-plugin';
import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import LogoStrapi from '../../assets/images/logo_strapi.png';
import PageTitle from '../../components/PageTitle';
import LocaleToggle from '../LocaleToggle';
import Wrapper from './Wrapper';
import Input from './Input';
import forms from './forms';

const AuthPage = ({
  match: {
    params: { authType },
  },
}) => {
  const handleSubmit = e => {
    e.preventDefault();
  };

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
          <div className="formContainer borderred">
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
                      return <Input {...input} key={input.name} />;
                    });
                  })}
                </div>
              </div>
            </form>
          </div>
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
