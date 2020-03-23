import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div(({ isActive, isDisabled, theme }) => {
  const cursor = isDisabled ? 'not-allowed' : 'pointer';
  const baseStyle = {
    color: '#9ea7b8',
    cursor,
    fontSize: theme.main.sizes.fonts.sm,
    fontWeight: theme.main.fontWeights.bold,
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
    height: '3rem',
  };

  if (isActive) {
    return {
      ...baseStyle,
      borderBottom: '2px solid #007eff',
      zIndex: 99,
    };
  }

  return baseStyle;
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
