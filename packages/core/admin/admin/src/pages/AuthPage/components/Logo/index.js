import React from 'react';
import { useConfigurations } from '../../../../hooks';

const Logo = () => {
  const { authLogo } = useConfigurations();

  return <img src={authLogo} alt="strapi" style={{ height: '72px' }} />;
};

export default Logo;
