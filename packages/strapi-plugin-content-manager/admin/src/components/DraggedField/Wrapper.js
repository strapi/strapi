import styled from 'styled-components';
import PropTypes from 'prop-types';

const getColor = isSelected => (isSelected ? '#aed4fb' : '#e9eaeb');

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

    background: ${({ isSelected }) => (isSelected ? '#e6f0fb' : '#fafafb')};
    border: 1px solid ${({ isSelected }) => getColor(isSelected)};
    border-radius: 2px;
    .name {
      position: relative;
      padding-left: 38px;
      padding-right: 38px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;

      ${({ isSelected }) => {
        if (isSelected) {
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
      border-right: 1px solid ${({ isSelected }) => getColor(isSelected)};
      cursor: move;
      z-index: 99;

      ${({ isSelected }) => {
        if (isSelected) {
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
      background-color: ${({ isSelected }) => getColor(isSelected)};
      cursor: pointer;

      position: absolute;
      top: -1px;
      right: 0;

      svg {
        align-self: center;
      }
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
