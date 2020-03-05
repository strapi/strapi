import styled from 'styled-components';
import PropTypes from 'prop-types';

const Flex = styled.div`
  display: flex;
  justify-content: ${({ justifyContent }) => justifyContent};
  flex-direction: ${({ flexDirection }) => flexDirection};
`;

Flex.defaultProps = {
  justifyContent: 'normal',
  flexDirection: 'row',
};

Flex.propTypes = {
  justifyContent: PropTypes.string,
  flexDirection: PropTypes.string,
};

export default Flex;
