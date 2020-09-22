import styled from 'styled-components';

/* eslint-disable indent */
const ComponentsPicker = styled.div`
  overflow: hidden;

  > div {
    margin-top: 15px;
    padding: 23px 18px 21px 18px;
    background-color: #f2f3f4;
  }

  .componentPickerTitle {
    margin-bottom: 15px;
    color: #919bae;
    font-weight: 600;
    font-size: 13px;
    line-height: normal;
  }
  .componentsList {
    display: flex;
    flex-wrap: wrap;
  }
`;

export default ComponentsPicker;
