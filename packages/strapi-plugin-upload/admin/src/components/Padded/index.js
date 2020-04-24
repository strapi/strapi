import PropTypes from 'prop-types';
import styled from 'styled-components';

const Padded = styled.div`
  padding-top: ${({ theme, size, top }) => top && (theme.main.sizes.paddings[size] || size)};
  padding-right: ${({ theme, size, right }) => right && (theme.main.sizes.paddings[size] || size)};
  padding-bottom: ${({ theme, size, bottom }) =>
  bottom && (theme.main.sizes.paddings[size] || size)};
  padding-left: ${({ theme, size, left }) => left && (theme.main.sizes.paddings[size] || size)};
`;

Padded.defaultProps = {
  bottom: false,
  left: false,
  right: false,
  top: false,
  size: 'sm',
};

Padded.propTypes = {
  bottom: PropTypes.bool,
  left: PropTypes.bool,
  right: PropTypes.bool,
  top: PropTypes.bool,
  size: PropTypes.string,
};

export default Padded;
