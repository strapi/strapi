import { StatusVariant } from '@strapi/design-system';
import styled, { DefaultTheme } from 'styled-components';

type BulletProps = {
  backgroundColor: keyof DefaultTheme['colors'];
};

const Bullet = styled.div<BulletProps>`
  margin-right: ${({ theme }) => theme.spaces[3]};
  width: ${6 / 16}rem;
  height: ${6 / 16}rem;
  border-radius: 50%;
  background: ${({ theme, backgroundColor }) => theme.colors[backgroundColor]};
`;

type StatusProps = {
  variant: StatusVariant;
};

/**
 * @deprecated use @strapi/design-system `Status` instead.
 */
const Status = ({ variant = 'primary' }: StatusProps) => {
  const backgroundColor: BulletProps['backgroundColor'] = `${variant}600`;

  return <Bullet backgroundColor={backgroundColor} />;
};

export { Status };
