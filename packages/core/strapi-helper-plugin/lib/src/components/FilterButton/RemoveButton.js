import styled from 'styled-components';

const RemoveButton = styled.button`
  display: flex;
  justify-items: center;
  height: 13px;
  padding-left: 10px;
  padding-right: 10px;
  margin-left: 10px;
  border-left: 1px solid rgba(0, 126, 255, 0.1);
  &:focus {
    outline: 0;
  }
`;

export default RemoveButton;
