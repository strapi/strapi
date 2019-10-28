import styled from 'styled-components';

const Flex = styled.div`
  display: flex;
  > button {
    cursor: pointer;
    padding-top: 0;
  }
  .trash-icon {
    color: #4b515a;
  }
  .button-wrapper {
    line-height: 35px;
  }
`;

export default Flex;
