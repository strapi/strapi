import styled from 'styled-components';
import PropTypes from 'prop-types';

const Border = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  border: 2px solid #007eff;
  ${({ checked }) => checked && 'display: block;'}
`;

Border.defaultProps = {
  checked: false,
};

Border.propTypes = {
  checked: PropTypes.bool,
};

export default Border;
