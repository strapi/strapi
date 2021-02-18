import styled from 'styled-components';
import PropTypes from 'prop-types';

const CardImgWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 0;
  margin-bottom: 7px;
  padding-top: ${({ small }) => (small ? '62.8%' : '63.8%')};
  border-radius: 2px;
  background-color: #f6f6f6;

  @media only screen and (min-width: 1280px) {
    padding-top: ${({ small }) => (small ? '120px' : '138px')};
  }

  .card-control-wrapper-displayed {
    display: flex;
    z-index: 1045;
  }

  .card-control-wrapper {
    display: none;
  }

  &:hover {
    .card-control-wrapper {
      display: flex;
      z-index: 1045;
    }
  }

  ${({ checked }) =>
  checked &&
    `
      .card-control-wrapper:not(.card-control-wrapper-hidden) {
        display: flex;
      }
  `}
`;

CardImgWrapper.defaultProps = {
  checked: false,
  hasError: false,
};

CardImgWrapper.propTypes = {
  checked: PropTypes.bool,
  hasError: PropTypes.bool,
};

export default CardImgWrapper;
