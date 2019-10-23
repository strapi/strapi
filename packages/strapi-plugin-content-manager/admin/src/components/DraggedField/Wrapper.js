import styled from 'styled-components';
import PropTypes from 'prop-types';

const getColor = (isOverRemove, isSelected, isOverEditBlock) => {
  if (isOverRemove) {
    return '#ffa784';
  } else if (isSelected || isOverEditBlock) {
    return '#aed4fb';
  } else {
    return '#e9eaeb';
  }
};

const getHeight = withLongerHeight => (withLongerHeight ? '102px' : '30px');

const Wrapper = styled.div`
  height: ${({ withLongerHeight }) => getHeight(withLongerHeight)};
  padding: 0 10px 0 0;
  margin-right: 4px;
  flex-basis: calc(100% / ${props => props.count});
  flex-shrink: 1;
  min-width: 130px;
  position: relative;

  .sub_wrapper {
    position: relative;
    height: ${({ withLongerHeight }) => getHeight(withLongerHeight)};
    line-height: ${({ withLongerHeight }) => getHeight(withLongerHeight)};
    cursor: pointer;

    background: ${({ isOverEditBlock, isOverRemove, isSelected }) => {
      if (isOverRemove) {
        return '#ffe9e0';
      } else if (isSelected || isOverEditBlock) {
        return '#e6f0fb';
      } else {
        return '#fafafb';
      }
    }};
    border: 1px solid
      ${({ isOverEditBlock, isOverRemove, isSelected }) =>
        getColor(isOverRemove, isSelected, isOverEditBlock)};
    border-radius: 2px;
    .name {
      position: relative;
      padding-left: 38px;
      padding-right: 38px;
      line-height: 30px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;

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
      position: absolute;
      top: -1px;
      left: 0;
      margin-right: 10px;
      padding-left: 10px;
      border-right: 1px solid
        ${({ isOverEditBlock, isOverRemove, isSelected }) =>
          getColor(isOverRemove, isSelected, isOverEditBlock)};
      cursor: move;
      z-index: 99;

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
      width: 30px;
      text-align: center;
      background-color: ${({ isOverEditBlock, isOverRemove, isSelected }) =>
        getColor(isOverRemove, isSelected, isOverEditBlock)};
      cursor: pointer;

      position: absolute;
      top: -1px;
      right: 0;
      z-index: 999;

      svg {
        align-self: center;
      }

      ${({ isOverRemove }) => {
        if (isOverRemove) {
          return `
          path {
            fill: #f64d0a;
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
