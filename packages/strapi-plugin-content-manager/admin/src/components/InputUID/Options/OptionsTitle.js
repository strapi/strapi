import styled from 'styled-components';

const OptionsTitle = styled.div`
  line-height: 2.1rem;
  font-size: 1.2rem;
  padding: 5px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.main.colors.grayLight};
  border-bottom: 1px solid ${({ theme }) => theme.main.colors.border};
`;

export default OptionsTitle;
