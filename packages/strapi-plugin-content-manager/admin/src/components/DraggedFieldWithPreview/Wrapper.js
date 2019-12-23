import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div`
  display: flex;
  position: relative;
  min-height: ${({ withLongerHeight }) =>
    withLongerHeight ? '102px' : '30px'};

  .sub {
    width: 100%;
    padding: 0 5px;
  }
`;

Wrapper.defaultProps = {
  withLongerHeight: false,
};

Wrapper.propTypes = {
  withLongerHeight: PropTypes.bool,
};

export default Wrapper;
