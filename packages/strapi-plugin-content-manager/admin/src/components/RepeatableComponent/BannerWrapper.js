import styled from 'styled-components';

const BannerWrapper = styled.button`
  display: flex;
  height: 36px;
  width: 100%;
  padding: 0 15px;
  border: 1px solid
    ${({ hasErrors, isOpen }) => {
      if (hasErrors) {
        return '#FFA784';
      } else if (isOpen) {
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
  border-bottom: 0;
  line-height: 36px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;

  background-color: ${({ hasErrors, isOpen }) => {
    if (hasErrors && isOpen) {
      return '#FFE9E0';
    } else if (isOpen) {
      return '#E6F0FB';
    } else {
      return '#ffffff';
    }
  }};

  ${({ hasErrors, isOpen }) => {
    if (hasErrors) {
      return `
        color: #f64d0a;
        font-weight: 600;
      `;
    }
    if (isOpen) {
      return `
        color: #007eff;
        font-weight: 600;
      `;
    }
  }}

  ${({ isOpen }) => {
    if (isOpen) {
      return `
        &.trash-icon i {
          color: #007eff;
        }
      `;
    }
  }}
  span, div, button {
    line-height: 34px;
  }

  .img-wrapper {
    width: 19px;
    height: 19px;
    align-self: center;
    margin-right: 19px;
    border-radius: 50%;
    background-color: ${({ hasErrors, isOpen }) => {
      if (hasErrors) {
        return '#FAA684';
      } else if (isOpen) {
        return '#AED4FB';
      } else {
        return '#F3F4F4';
      }
    }}
    text-align: center;
    line-height: 19px;

    ${({ isOpen }) => !isOpen && 'transform: rotate(180deg)'}
  }

  .cta-wrapper {
    margin-left: auto;
    > button {
      padding: 0;
    }

    .grab {
      cursor: move;
    }
  }

  webkit-font-smoothing: antialiased;
`;

export default BannerWrapper;
