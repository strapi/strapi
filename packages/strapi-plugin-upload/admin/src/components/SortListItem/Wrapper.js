import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const SortListItem = styled.li`
  padding: 0 14px;
  height: 27px;
  &:hover {
    cursor: pointer;
    background-color: ${({ theme }) => theme.main.colors.mediumGrey};
  }
  ${({ isActive, theme }) =>
  isActive &&
    `
    background-color: ${theme.main.colors.mediumGrey};
  `}
`;

SortListItem.defaultProps = {
  isActive: false,
};

SortListItem.propTypes = {
  isActive: PropTypes.bool,
  ...themePropTypes,
};

export default SortListItem;
