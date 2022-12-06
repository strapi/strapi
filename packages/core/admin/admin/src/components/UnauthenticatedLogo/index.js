import React from 'react';
import styled from 'styled-components';
import { useConfigurations } from '../../hooks';

const Img = styled.img`
  height: ${72 / 16}rem;
`;

const Logo = () => {
  const {
    logos: { auth },
  } = useConfigurations();

  return <Img src={auth.custom} aria-hidden alt="" />;
};

export default Logo;
