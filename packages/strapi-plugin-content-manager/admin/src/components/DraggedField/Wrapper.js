import styled from 'styled-components';
import PropTypes from 'prop-types';
import getColor from './utils/getColor';
import getHeight from './utils/getHeight';

const Wrapper = styled.div`
  ${({ withLongerHeight }) => {
    if (!withLongerHeight) {
      return `
       height: 30px;
    `;
    }
  }};
  min-height: ${({ withLongerHeight }) => getHeight(withLongerHeight)};
  padding: 0 10px 0 0;
  flex-basis: calc(100% / ${props => props.count});
  flex-shrink: 1;
  min-width: 130px;
  position: relative;

  .sub_wrapper {
    position: relative;
    cursor: pointer;

    background: ${({ isOverEditBlock, isOverRemove, isSelected, isSub }) => {
      if (isOverRemove) {
        return '#ffe9e0';
      } else if (isSelected || isOverEditBlock) {
        return '#e6f0fb';
      } else if (isSub) {
        return '#ffffff';
      } else {
        return '#fafafb';
      }
    }};
    border: 1px solid
      ${({ isOverEditBlock, isOverRemove, isSelected }) =>
        getColor(isOverRemove, isSelected, isOverEditBlock)};
    border-radius: 2px;
    .name {
      ${({ isOverEditBlock, isOverRemove, isSelected }) => {
        if (isOverRemove) {
          return `
            color: #f64d0a
          `;
        }

        if (isSelected || isOverEditBlock) {
          return `
            color: #007eff
          `;
        }
      }}
    }
    .grab {
      border-right: 1px solid
        ${({ isOverEditBlock, isOverRemove, isSelected }) =>
          getColor(isOverRemove, isSelected, isOverEditBlock)};

      ${({ isOverEditBlock, isOverRemove, isSelected }) => {
        if (isOverRemove) {
          return `
          g {
            fill: #ffa784;
          }
          `;
        }

        if (isSelected || isOverEditBlock) {
          return `
          g {
            fill: #007eff;
          }
          `;
        }
      }}
    }

    .remove {
      background-color: ${({ isOverEditBlock, isOverRemove, isSelected }) =>
        getColor(isOverRemove, isSelected, isOverEditBlock)};
      cursor: pointer;

      svg {
        align-self: center;
      }

      ${({ isOverEditBlock, isOverRemove, isSelected }) => {
        if (isOverRemove) {
          return `
          path {
            fill: #f64d0a;
          }
          `;
        }

        if (isSelected || isOverEditBlock) {
          return `
          path {
            fill: #007eff;
          }
          `;
        }
      }}
    }
  }
`;

Wrapper.defaultProps = {
  count: 1,
  isSelected: false,
};

Wrapper.propTypes = {
  count: PropTypes.number,
  isSelected: PropTypes.bool,
};

export default Wrapper;
