import styled from 'styled-components';
import PropTypes from 'prop-types';

const CardImgWrapper = styled.div`
  height: ${({ isSmall }) => (isSmall ? '127px' : '156px')};
  width: ${({ isSmall }) => (isSmall ? '200px' : '245px')};
  border-radius: 2px;
  background: #333740;
`;

CardImgWrapper.defaultProps = {
  isSmall: false,
};

CardImgWrapper.propTypes = {
  isSmall: PropTypes.bool,
};

export default CardImgWrapper;
