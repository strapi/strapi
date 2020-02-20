import styled from 'styled-components';

const Text = styled.p`
  margin: 0;
  line-height: 18px;
  color: ${({ theme, color }) => theme.main.colors[color]};
  font-size: ${({ theme, fontSize }) => theme.main.fontSizes[fontSize]};
  font-weight: ${({ theme, fontWeight }) => theme.main.fontWeights[fontWeight]};
`;

Text.defaultProps = {
  color: 'greyDark',
  fontSize: 'md',
  fontWeight: 'regular',
};

export default Text;
