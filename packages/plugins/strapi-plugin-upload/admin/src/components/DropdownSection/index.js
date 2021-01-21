import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const DropdownSection = styled.div`
  display: none;
  position: absolute;
  top: 38px;
  left: 0;
  z-index: 1046;
  background-color: ${({ theme }) => theme.main.colors.white};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  border: 1px solid ${({ theme }) => theme.main.colors.darkGrey};
  box-shadow: 0 2px 4px ${({ theme }) => theme.main.colors.greyAlpha};
  ${({ isOpen }) => isOpen && 'display: block;'}
`;

DropdownSection.defaultProps = {
  isOpen: false,
};

DropdownSection.propTypes = {
  isOpen: PropTypes.bool,
  ...themePropTypes,
};

export default DropdownSection;
