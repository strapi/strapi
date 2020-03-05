import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  background-color: ${({ isImg }) => (isImg ? '#333740' : '#F2F3F4')};
`;

Wrapper.defaultProps = {
  isImg: false,
};

Wrapper.propTypes = {
  isImg: PropTypes.bool,
};

export default Wrapper;
