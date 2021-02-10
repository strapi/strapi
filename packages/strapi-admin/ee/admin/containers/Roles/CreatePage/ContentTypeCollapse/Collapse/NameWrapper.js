import styled from 'styled-components';
import PropTypes from 'prop-types';

const NameWrapper = styled.div`
  display: flex;
  align-items: center;
  width: ${({ width }) => width};
`;

NameWrapper.defaultProps = {
  width: '18rem',
};

NameWrapper.propTypes = {
  width: PropTypes.string,
};

export default NameWrapper;
