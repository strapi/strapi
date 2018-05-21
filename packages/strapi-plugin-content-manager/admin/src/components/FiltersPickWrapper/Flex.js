import styled from 'styled-components';

const Flex = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 0 30px 9px 30px !important;
  color: #C3C5C8;
  font-size: 13px;

  > span {
    cursor: pointer;
    &:after {
      content: '\f077';
      font-family: FontAwesome;
      font-size: 10px;
    }
  }
`;

export default Flex;
