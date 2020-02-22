import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const SortListItem = styled.li`
  padding: 0 14px;
  height: 27px;
  line-height: 27px;
  &:hover {
    cursor: pointer;
    background-color: ${({ theme }) =>
    theme.main.colors.filters.list.hover.background};
  }
  ${({ isActive, theme }) =>
    isActive &&
    `
    background-color: ${theme.main.colors.filters.list.hover.background};
  `}
`;

SortListItem.propTypes = {
  ...themePropTypes,
};

export default SortListItem;
