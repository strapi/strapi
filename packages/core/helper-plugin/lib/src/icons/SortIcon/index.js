import styled from 'styled-components';
import FilterDropdown from '@strapi/icons/FilterDropdown';
import PropTypes from 'prop-types';

const transientProps = {
  isUp: true,
};

const SortIcon = styled(FilterDropdown).withConfig({
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
