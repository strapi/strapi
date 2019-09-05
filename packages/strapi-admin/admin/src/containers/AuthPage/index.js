import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
// import { Link } from 'react-router-dom';
// import { auth, Button, InputsIndex as Input } from 'strapi-helper-plugin';
import LocaleToggle from '../LocaleToggle';
import Wrapper from './Wrapper';

import LogoStrapi from '../../assets/images/logo_strapi.png';

const style = {
  position: 'fixed',
  top: '0',
  right: '0',
  display: 'flex',
  zIndex: '1050',
};

const AuthPage = ({
  match: {
    params: { authType },
  },
}) => {
  return (
    <Wrapper>
      <div style={style}>
        <LocaleToggle isLogged className="localeDropdownMenuNotLogged" />
      </div>
      <div className="wrapper">
        <div className="headerContainer">
          {authType === 'register' ? (
            <FormattedMessage id="users-permissions.Auth.form.header.register" />
          ) : (
            <img src={LogoStrapi} alt="strapi-logo" />
          )}
        </div>
      </div>
    </Wrapper>
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
