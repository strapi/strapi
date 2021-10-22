import styled from 'styled-components';
import Carret from '@strapi/icons/Carret';

const CarretIcon = styled(Carret)`
  display: none;
  width: ${10 / 16}rem;
  transform: rotate(${({ $isActive }) => ($isActive ? '180' : '0')}deg);
  margin-left: ${({ theme }) => theme.spaces[2]};
  * {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

export default CarretIcon;
