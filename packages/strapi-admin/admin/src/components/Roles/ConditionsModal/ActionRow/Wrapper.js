import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  height: 36px;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  margin-bottom: 18px;
  background-color: ${({ theme, isGrey }) =>
    isGrey ? theme.main.colors.content.background : theme.main.colors.white};
`;

export default Wrapper;
