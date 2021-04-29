import styled from 'styled-components';

const Separator = styled.div`
  padding-top: 1.4rem;
  margin-bottom: 2.8rem;
  border-bottom: 1px solid ${({ theme }) => theme.main.colors.brightGrey};
`;

export default Separator;
