import styled from 'styled-components';
import PropTypes from 'prop-types';

const Flex = styled.div`
  display: flex;
  justify-content: ${({ justifyContent }) => justifyContent};
  flex-direction: ${({ flexDirection }) => flexDirection};
  flex-wrap: ${({ flexWrap }) => flexWrap};
`;

Flex.defaultProps = {
  justifyContent: 'normal',
  flexDirection: 'row',
  flexWrap: 'nowrap',
};

Flex.propTypes = {
  justifyContent: PropTypes.string,
  flexDirection: PropTypes.string,
  flexWrap: PropTypes.string,
};

export default Flex;
