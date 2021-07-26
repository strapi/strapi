import React, { useContext } from 'react';
import { AuthLogoContext } from '../../../../contexts';
import Img from './Img';

const Logo = () => {
  const { logo } = useContext(AuthLogoContext);

  return <Img src={logo} alt="strapi-logo" />;
};

export default Logo;
