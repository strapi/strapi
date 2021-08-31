import styled from 'styled-components';

const RightContent = styled.div`
  display: flex;
  z-index: 10;
  background-color: ${({ theme }) => theme.main.colors.white};
  align-items: center;
  line-height: 32px;
  right: 1px;
  top: 1px;
  position: absolute;
`;

export default RightContent;
