import styled from 'styled-components';

import { useConfiguration } from '../hooks/useConfiguration';

const Img = styled.img`
  height: ${72 / 16}rem;
`;

const Logo = () => {
  const {
    logos: { auth },
  } = useConfiguration();

  return <Img src={auth?.custom ?? auth.default} aria-hidden alt="" />;
};

export { Logo };
