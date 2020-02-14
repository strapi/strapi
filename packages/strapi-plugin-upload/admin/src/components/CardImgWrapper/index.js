import styled from 'styled-components';
import PropTypes from 'prop-types';

const CardImgWrapper = styled.div`
  width: 100%;
  height: 0;
  padding-top: ${({ isSmall }) =>
    isSmall ? 'calc(156 / 245 * 100%)' : 'calc(397 / 431 * 100%)'};
  border-radius: 2px;
  background: ${({ withOverlay }) => (withOverlay ? '#F6F6F6' : '#333740')};
  overflow: hidden;
`;

CardImgWrapper.defaultProps = {
  isSmall: false,
  withOverlay: false,
};

CardImgWrapper.propTypes = {
  isSmall: PropTypes.bool,
  withOverlay: PropTypes.bool,
};

export default CardImgWrapper;
