/**
 *
 * Toggle
 *
 */

import styled from 'styled-components';
import PropTypes from 'prop-types';

const Toggle = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  opacity: 0;
`;

Toggle.defaultProps = {
  type: 'checkbox',
};

Toggle.propTypes = {
  type: PropTypes.string,
};

export default Toggle;
