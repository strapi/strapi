import styled from 'styled-components';

import { pxToRem } from '@strapi/helper-plugin';

// TODO
// const CustomBullet = styled(Bullet)`
//   width: ${pxToRem(6)};
//   height: ${pxToRem(6)};
//   * {
//     fill: ${({ theme, $bulletColor }) => theme.colors[$bulletColor]};
//   }
// `;

const Bullet = styled.div`
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  border: ${({ theme, borderColor }) => `1px solid ${theme.colors[borderColor]}`};
  background: ${({ theme, $bulletColor }) => theme.colors[$bulletColor]};
  border-radius: 50%;
`;

export default Bullet;
