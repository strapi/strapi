import styled from 'styled-components';
import PropTypes from 'prop-types';

const Text = styled.p`
  display: contents;
  color: ${({ theme, color }) => theme.main.colors[color] || color};
  font-size: ${({ theme, fontSize }) => theme.main.sizes.fonts[fontSize]};
  font-weight: ${({ theme, fontWeight }) => theme.main.fontWeights[fontWeight]};
  text-transform: ${({ textTransform }) => textTransform};
`;

Text.defaultProps = {
  color: 'black',
  fontSize: 'md',
  fontWeight: 'regular',
  textTransform: 'none',
};

Text.propTypes = {
  color: PropTypes.string,
  fontSize: PropTypes.string,
  fontWeight: PropTypes.string,
  textTransform: PropTypes.string,
};

export default Text;
