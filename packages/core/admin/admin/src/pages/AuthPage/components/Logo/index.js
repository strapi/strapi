import React from 'react';
import { useConfigurations } from '../../../../hooks';
import Img from './Img';

const Logo = () => {
  const { authLogo } = useConfigurations();

  return <Img src={authLogo} alt="strapi" />;
};

export default Logo;
