import styled from 'styled-components';

const hoverStyle = `
  border: 1px solid #aed4fb;
  background-color: #e6f0fb;
  > button {
    :before,
    :after {
      background-color: #007eff;
    }
    background-color: #aed4fb;
  }

  > p {
    color: #007eff;
  }
`;

/* eslint-disable indent */
const NonRepeatableWrapper = styled.div`
  margin: 0 !important;
  padding: 0 20px !important;

  ${({ isEmpty, isFromDynamicZone, isReadOnly }) => {
    if (isEmpty) {
      return `
      position: relative;
      height: 108px;
      margin-bottom: 25px !important;
      background-color: #fafafb;
      text-align: center;
      cursor: ${isReadOnly ? 'not-allowed' : 'pointer'};
      border-radius: 2px;

      > button {
        position: absolute;
        top: 30px;
        left: calc(50% - 18px);
        height: 36px;
        width: 36px;
        line-height: 38px;
        border-radius: 50%;
        background-color: #f3f4f4;
        cursor: ${isReadOnly ? 'not-allowed !important' : 'pointer'};
      }
      border: 1px solid transparent;

      &:hover {
        ${isReadOnly ? '' : hoverStyle};
      }
    `;
    }

    if (isFromDynamicZone) {
      return `
      background-color: #fff;
      padding: 0 10px !important;
    `;
    }

    return `
    padding-top: 25px !important;
    background-color: #f7f8f8;
    margin-bottom: 18px !important;
  `;
  }}
`;

NonRepeatableWrapper.defaultProps = {
  isReadOnly: false,
};

export default NonRepeatableWrapper;
