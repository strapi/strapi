import { CarretDown } from '@strapi/icons';
import styled from 'styled-components';

const CarretIcon = styled(CarretDown)`
  display: none;
  width: ${10 / 16}rem;
  transform: rotate(${({ $isActive }) => ($isActive ? '180' : '0')}deg);
  margin-left: ${({ theme }) => theme.spaces[2]};
`;

export default CarretIcon;
