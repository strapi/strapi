import styled from 'styled-components';
import { CarretDown } from '@strapi/icons';
import PropTypes from 'prop-types';

const transientProps = {
  isUp: true,
};

const SortIcon = styled(CarretDown).withConfig({
  shouldForwardProp: (prop, defPropValFN) => !transientProps[prop] && defPropValFN(prop),
})`
  transform: ${({ isUp }) => `rotate(${isUp ? '180' : '0'}deg)`};
`;

SortIcon.defaultProps = {
  isUp: false,
};

SortIcon.propTypes = {
  isUp: PropTypes.bool,
};

export default SortIcon;
