import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ isFile }) => (isFile ? '#F2F3F4' : '#333740')};
`;

Wrapper.defaultProps = {
  isFile: false,
};

Wrapper.propTypes = {
  isFile: PropTypes.bool,
};

export default Wrapper;
