import styled from 'styled-components';

const DeleteAll = styled.span`
  position: absolute;
  color: #f64d0a;
  font-weight: 500;
  cursor: pointer;
  &:after {
    position: relative;
    top: -1px;
    content: '\f2ed';
    margin-left: 7px;
    font-size: 10px;
    font-family: FontAwesome;
    -webkit-font-smoothing: antialiased;
  }
`;
export default DeleteAll;
