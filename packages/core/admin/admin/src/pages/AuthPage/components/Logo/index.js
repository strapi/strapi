import React from 'react';
import styled from 'styled-components';
import { useConfigurations } from '../../../../hooks';

const Img = styled.img`
  height: 72px;
`;

const Logo = () => {
  const { authLogo } = useConfigurations();

  return <Img src={authLogo} aria-hidden alt="" />;
};

export default Logo;
