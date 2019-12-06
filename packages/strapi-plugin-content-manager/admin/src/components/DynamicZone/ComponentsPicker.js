import styled, { css } from 'styled-components';

const ComponentsPicker = styled.div`
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.2s ease-out;

  > div {
    margin-top: 15px;
    padding: 23px 18px 21px 18px;
    background-color: #f2f3f4;
  }

  ${({ isOpen }) =>
    isOpen &&
    css`
      max-height: 260px;
    `}

  .componentPickerTitle {
    margin-bottom: 15px;
    color: #919bae;
    font-weight: 600;
    font-size: 13px;
    line-height: normal;
  }
  .componentsList {
    display: flex;
    overflow-x: auto;
  }
`;

export default ComponentsPicker;
