import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const SortList = styled.ul`
  margin-bottom: 0;
  padding: 0;
  min-width: 230px;
  list-style-type: none;
  font-size: ${({ theme }) => theme.main.fontSizes.md};
`;

SortList.propTypes = {
  ...themePropTypes,
};

export default SortList;
