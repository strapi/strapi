import styled from 'styled-components';
import PropTypes from 'prop-types';

const Text = styled.p`
  margin: 0;
  line-height: ${({ lineHeight }) => lineHeight};
  color: ${({ theme, color }) => theme.main.colors[color] || color};
  font-size: ${({ theme, fontSize }) => theme.main.sizes.fonts[fontSize]};
  font-weight: ${({ theme, fontWeight }) => theme.main.fontWeights[fontWeight]};
  text-transform: ${({ textTransform }) => textTransform};
  ${({ ellipsis }) =>
  ellipsis &&
    `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `}
`;

Text.defaultProps = {
  color: 'greyDark',
  ellipsis: false,
  fontSize: 'md',
  fontWeight: 'regular',
  lineHeight: 'normal',
  textTransform: 'none',
};

Text.propTypes = {
  color: PropTypes.string,
  ellipsis: PropTypes.bool,
  fontSize: PropTypes.string,
  fontWeight: PropTypes.string,
  lineHeight: PropTypes.string,
  textTransform: PropTypes.string,
};

export default Text;
