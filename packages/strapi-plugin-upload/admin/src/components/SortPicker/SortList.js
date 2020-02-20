import styled from 'styled-components';

const SortList = styled.ul`
  display: none;
  position: absolute;
  top: 38px;
  left: 0;
  margin-bottom: 0;
  padding: 0;
  min-width: 230px;
  z-index: 1;
  list-style-type: none;
  font-size: 13px;
  background-color: #ffffff;
  border: 1px solid #e3e9f3;
  box-shadow: 0 2px 4px rgba(227, 233, 243, 0.5);
  ${({ isOpen }) =>
    isOpen &&
    `
    display: block;
  `}
`;

export default SortList;
