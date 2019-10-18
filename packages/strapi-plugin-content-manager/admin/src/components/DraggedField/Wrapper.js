import styled from 'styled-components';
import PropTypes from 'prop-types';

const getColor = (isOverRemove, isSelected) => {
  if (isSelected) {
    return '#aed4fb';
  } else if (isOverRemove) {
    return '#ffa784';
  } else {
    return '#e9eaeb';
  }
};

const Wrapper = styled.div`
  height: 30px;
  padding: 0 10px 0 0;
  margin-right: 4px;
  flex-basis: calc(100% / ${props => props.count});
  flex-shrink: 1;
  min-width: 130px;
  position: relative;

  .sub_wrapper {
    position: relative;
    height: 30px;
    line-height: 30px;

    background: ${({ isOverRemove, isSelected }) => {
      if (isSelected) {
        return '#e6f0fb';
      } else if (isOverRemove) {
        return '#ffe9e0';
      } else {
        return '#fafafb';
      }
    }};
    border: 1px solid
      ${({ isOverRemove, isSelected }) => getColor(isOverRemove, isSelected)};
    border-radius: 2px;
    .name {
      position: relative;
      padding-left: 38px;
      padding-right: 38px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;

      ${({ isOverRemove, isSelected }) => {
        if (isSelected) {
          return `
            color: #007eff
          `;
        }

        if (isOverRemove) {
          return `
            color: #f64d0a
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
        ${({ isOverRemove, isSelected }) => getColor(isOverRemove, isSelected)};
      cursor: move;
      z-index: 99;

      ${({ isOverRemove, isSelected }) => {
        if (isSelected) {
          return `
          g {
            fill: #007eff;
          }
          `;
        }
        if (isOverRemove) {
          return `
          g {
            fill: #ffa784;
          }
          `;
        }
      }}
    }

    .remove {
      width: 30px;
      text-align: center;
      background-color: ${({ isOverRemove, isSelected }) =>
        getColor(isOverRemove, isSelected)};
      cursor: pointer;

      position: absolute;
      top: -1px;
      right: 0;

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
