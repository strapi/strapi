import PropTypes from 'prop-types';
import styled from 'styled-components';

// TODO remove compo when DS ready
const BaselineAlignment = styled.div`
  padding-top: ${({ size, top }) => top && size};
  padding-right: ${({ size, right }) => right && size};
  padding-bottom: ${({ size, bottom }) => bottom && size};
  padding-left: ${({ size, left }) => left && size};
`;

BaselineAlignment.defaultProps = {
  bottom: false,
  left: false,
  right: false,
  size: '0',
  top: false,
};

BaselineAlignment.propTypes = {
  bottom: PropTypes.bool,
  left: PropTypes.bool,
  right: PropTypes.bool,
  size: PropTypes.string,
  top: PropTypes.bool,
};

export default BaselineAlignment;
