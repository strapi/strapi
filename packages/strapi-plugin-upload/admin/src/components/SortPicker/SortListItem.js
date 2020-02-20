import styled from 'styled-components';

const SortListItem = styled.li`
  padding: 0 14px;
  height: 27px;
  line-height: 27px;
  &:hover {
    cursor: pointer;
    background: #f6f6f6;
  }
  ${({ isActive }) =>
    isActive &&
    `
    background: #F6F6F6;
  `}
`;

export default SortListItem;
