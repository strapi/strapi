import styled from 'styled-components';

const OptionsTitle = styled.div`
  line-height: 2.1rem;
  font-size: 1.2rem;
  padding: 5px;
  text-transform: uppercase;
  color: ${props => props.theme.main.colors['gray-light']};
  border-bottom: 1px solid ${props => props.theme.main.colors.border};
`;

export default OptionsTitle;
