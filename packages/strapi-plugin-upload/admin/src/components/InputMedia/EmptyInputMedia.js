import styled from 'styled-components';

const EmptyInputMedia = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.main.colors.black};
`;

export default EmptyInputMedia;
