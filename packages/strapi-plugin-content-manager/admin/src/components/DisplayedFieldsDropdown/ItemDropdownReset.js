import styled from 'styled-components';
import ItemDropdown from './ItemDropdown';

const ItemDropdownReset = styled(ItemDropdown)`
  margin-bottom: 6px;
  padding: 0.8rem 1.5rem 0.2rem 1.5rem;
  font-weight: 600;
  font-size: 1.3rem;

  &:hover {
    background-color: #ffffff !important;
  }
  > div {
    > span:last-child {
      color: #007eff;
      font-weight: 400;
      cursor: pointer;
    }
  }
`;

export default ItemDropdownReset;
