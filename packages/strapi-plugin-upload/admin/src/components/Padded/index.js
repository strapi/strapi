import PropTypes from 'prop-types';
import styled from 'styled-components';

const Padded = styled.div`
  padding-top: ${({ theme, size, top }) => top && theme.main.sizes.padding[size]};
  padding-right: ${({ theme, size, right }) => right && theme.main.sizes.padding[size]};
  padding-bottom: ${({ theme, size, bottom }) => bottom && theme.main.sizes.padding[size]};
  padding-left: ${({ theme, size, left }) => left && theme.main.sizes.padding[size]};
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
