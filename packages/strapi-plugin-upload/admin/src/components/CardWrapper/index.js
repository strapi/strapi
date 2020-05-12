import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div`
  width: 100%;
  margin-bottom: 16px;
  overflow: hidden;
  &:hover {
    cursor: ${({ isDraggable }) => (isDraggable ? 'move' : 'pointer')};
  }
`;

Wrapper.defaultProps = {
  isDisabled: false,
  isDraggable: false,
};

Wrapper.propTypes = {
  isDisabled: PropTypes.bool,
  isDraggable: PropTypes.bool,
};

export default Wrapper;
