import React from 'react';
import styled from 'styled-components';

type BulletProps = {
  backgroundColor: 'alternative600' | 'danger600' | 'neutral600' | 'primary600' | 'secondary600' | 'success600' | 'warning600';
}

const Bullet = styled.div<BulletProps>`
  margin-right: ${({ theme }) => theme.spaces[3]};
  width: ${6 / 16}rem;
  height: ${6 / 16}rem;
  border-radius: 50%;
  background: ${({ theme, backgroundColor }) => theme.colors[backgroundColor]};
`;

type StatusProps = {
  variant: 'alternative' | 'danger' | 'neutral' | 'primary' | 'secondary' | 'success' | 'warning';
};

const Status: React.FC<StatusProps> = ({ variant = 'primary' }) => {
  const backgroundColor: BulletProps["backgroundColor"] = `${variant}600`;

  return <Bullet backgroundColor={backgroundColor} />;
};

export { Status };
