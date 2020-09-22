import styled from 'styled-components';

/* eslint-disable */

const BannerWrapper = styled.button`
  display: flex;
  height: 36px;
  width: 100%;
  padding: 0 15px;
  border: 1px solid
    ${({ isOpen }) => {
      if (isOpen) {
        return '#AED4FB';
      } else {
        return 'rgba(227, 233, 243, 0.75)';
      }
    }};

  ${({ isFirst }) => {
    if (isFirst) {
      return `
        border-top-right-radius: 2px;
        border-top-left-radius: 2px;
      `;
    }
  }}

  ${({ isOpen }) => {
    if (!isOpen) {
      return `
        border-bottom: 0;
      `;
    }
  }}
  

  font-size: 13px;
  font-weight: 500;
  cursor: pointer;

  background-color: ${({ isOpen }) => {
    if (isOpen) {
      return '#E6F0FB';
    } else {
      return '#ffffff';
    }
  }};

  ${({ isOpen }) => {
    if (isOpen) {
      return `
        color: #007eff;
        font-weight: 600;
      `;
    }
  }}

  &:focus {
    outline: 0;
  }

  .img-wrapper {
    width: 19px;
    height: 19px;
    margin-right: 19px;
    border-radius: 50%;
    background-color: ${({ isOpen }) => {
      if (isOpen) {
        return '#AED4FB';
      } else {
        return '#F3F4F4';
      }
    }};
    text-align: center;
    ${({ isOpen }) => !isOpen && 'transform: rotate(180deg)'};
  }
  .label {
    text-transform: capitalize;
  }

  ${({ isOpen }) => {
    let fill = '#ABB3C2';
    if (isOpen) {
      fill = '#007EFF';
    }
    return `
      svg {
        path {
          fill: ${fill} !important;
        }
      }
    `;
  }}

  -webkit-font-smoothing: antialiased;

  > div {
    align-self: center;
    margin-top: -2px;
  }
`;

export default BannerWrapper;
