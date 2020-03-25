import styled from 'styled-components';

const StyledCardControl = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 30px;
  height: 30px;
  margin-left: 5px;
  background-color: #6dbb1a;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  cursor: pointer;
  font-size: 11px;
  color: ${({ theme }) => theme.main.colors.white};
`;

export default StyledCardControl;
