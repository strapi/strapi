import styled from 'styled-components';

const RightContentLabel = styled.div`
  padding: 0 5px;
  text-transform: capitalize;
  font-size: 1.3rem;
  color: ${({ theme, color }) => theme.main.colors[color]};
`;

export default RightContentLabel;
