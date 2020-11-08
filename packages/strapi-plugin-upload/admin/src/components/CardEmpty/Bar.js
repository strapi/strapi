import styled from 'styled-components';
import PropTypes from 'prop-types';

const Bar = styled.div`
  height: 10px;
  width: ${({ small }) => (small ? '64px' : '110px')};
  margin-top: ${({ small }) => (small ? '15px' : '8px')};
  background: #f6f6f6;
`;

Bar.defaultProps = {
  small: false,
};

Bar.propTypes = {
  small: PropTypes.bool,
};

export default Bar;
