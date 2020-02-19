import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div(({ isActive, isDisabled }) => {
  const cursor = isDisabled ? 'not-allowed' : 'pointer';

  if (isActive) {
    return {
      height: '3rem',
      cursor,
      color: '#007eff',
      fontWeight: 600,
      borderBottom: '2px solid #007eff',
      zIndex: 99,
    };
  }

  return {
    cursor,
  };
});

Wrapper.defaultProps = {
  isActive: false,
  isDisabled: false,
};

Wrapper.propTypes = {
  isActive: PropTypes.bool,
  isDisabled: PropTypes.bool,
};

export default Wrapper;
