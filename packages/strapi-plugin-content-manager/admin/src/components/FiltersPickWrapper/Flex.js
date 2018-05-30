import styled from 'styled-components';

const Flex = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 0 0 9px 30px !important;
  color: #C3C5C8;
  font-size: 13px;

  > span {
    vertical-align: text-top;
    cursor: pointer;

    &:after {
      margin-left: 2px;
      content: '\f077';
      font-family: FontAwesome;
      font-size: 10px;
    }
  }
`;

export default Flex;
