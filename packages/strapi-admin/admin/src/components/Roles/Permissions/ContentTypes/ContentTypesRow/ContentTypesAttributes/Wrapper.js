import styled from 'styled-components';

const Wrapper = styled.div`
  padding-top: ${({ withPadding }) => (withPadding ? '9px' : '0px')};
  border: 1px solid ${({ theme }) => theme.main.colors.darkBlue};
  border-top: none;
  border-radius: 0px 0px 2px 2px;
`;

export default Wrapper;
