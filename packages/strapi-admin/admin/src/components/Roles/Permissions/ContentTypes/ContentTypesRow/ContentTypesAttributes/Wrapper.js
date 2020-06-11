import styled from 'styled-components';

const Wrapper = styled.div`
  border: 1px solid ${({ theme }) => theme.main.colors.darkBlue};
  border-top: none;
`;

export default Wrapper;
