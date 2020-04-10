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
  isDraggable: false,
};

Wrapper.propTypes = {
  isDraggable: PropTypes.bool,
};

export default Wrapper;
