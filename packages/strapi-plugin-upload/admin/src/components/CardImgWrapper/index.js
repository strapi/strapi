import styled from 'styled-components';
import PropTypes from 'prop-types';

const CardImgWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 0;
  padding-top: ${({ isSmall }) =>
    isSmall ? 'calc(156 / 245 * 100%)' : 'calc(397 / 431 * 100%)'};
  border-radius: 2px;
  background: ${({ withOverlay }) => (withOverlay ? '#F6F6F6' : '#333740')};
  overflow: hidden;

  ${({ hasError }) => {
    if (hasError) {
      return `
        background: #F2F3F4;
        border: 1px solid #FF5D00;
      `;
    }

    return '';
  }}

  .card-control-wrapper {
    display: none;
  }

  &:hover {
    .card-control-wrapper {
      display: flex;
      z-index: 1050;
    }
  }
`;

CardImgWrapper.defaultProps = {
  hasError: false,
  isSmall: false,
  withOverlay: false,
};

CardImgWrapper.propTypes = {
  hasError: PropTypes.bool,
  isSmall: PropTypes.bool,
  withOverlay: PropTypes.bool,
};

export default CardImgWrapper;
