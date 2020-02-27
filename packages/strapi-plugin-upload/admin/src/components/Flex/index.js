import styled from 'styled-components';
import PropTypes from 'prop-types';

const Flex = styled.div`
  display: flex;
  justify-content: ${({ justifyContent }) => justifyContent};
`;

Flex.defaultProps = {
  justifyContent: 'normal',
};

Flex.propTypes = {
  justifyContent: PropTypes.string,
};

export default Flex;
