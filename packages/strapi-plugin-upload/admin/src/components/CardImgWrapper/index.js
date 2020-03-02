import styled from 'styled-components';
import PropTypes from 'prop-types';

const CardImgWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 0;
  padding-top: ${({ isSmall }) =>
    isSmall ? 'calc(156 / 245 * 100%)' : 'calc(397 / 431 * 100%)'};
  border-radius: 2px;
  background-color: #f6f6f6;
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

  ${({ isSelected }) =>
    isSelected &&
    `
    border: 2px solid #007EFF;
    .card-control-wrapper {
      display: flex;
      z-index: 1050;
    }
  `}

  .card-control-wrapper {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 10px;
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
  isSelected: false,
  isSmall: false,
};

CardImgWrapper.propTypes = {
  hasError: PropTypes.bool,
  isSelected: PropTypes.bool,
  isSmall: PropTypes.bool,
};

export default CardImgWrapper;
