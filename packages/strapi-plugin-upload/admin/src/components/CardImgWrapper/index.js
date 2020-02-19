import styled from 'styled-components';
import PropTypes from 'prop-types';

const CardImgWrapper = styled.div`
  position: relative;
  height: ${({ isSmall }) => (isSmall ? '127px' : '156px')};
  min-width: ${({ isSmall }) => (isSmall ? '200px' : '245px')};
  border-radius: 2px;
  background: ${({ withOverlay }) => (withOverlay ? '#F6F6F6' : '#333740')};
`;

CardImgWrapper.defaultProps = {
  isSmall: false,
};

CardImgWrapper.propTypes = {
  isSmall: PropTypes.bool,
};

export default CardImgWrapper;
