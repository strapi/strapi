import styled from 'styled-components';

const NaturePickerWrapper = styled.div`
  width: 100%;
  padding-top: 70px;
  cursor: pointer;

  .relationNatureWrapper {
    position: relative;
    display: flex;
    justify-content: space-around;
    padding: 0 25px;
    margin-bottom: 5px;
    > img {
      z-index: 2;
    }
    &:before {
      content: '';
      position: absolute;
      top: 20px;
      left: 0;
      height: 2px;
      width: 100%;
      background-color: #1c5de7;
      z-index: 0;
    }
  }

  .infoContainer {
    margin-bottom: 10px;
    padding-top: 1px;
    padding-right: 10px;
    padding-left: 10px;
    word-wrap: break-word;
    line-height: 1.8rem !important;
    text-align: center;
    font-size: 1.3rem;
    text-align: center;
    margin: 0;
    line-height: 22px;
    > span:nth-child(1),
    span:nth-child(3) {
      text-transform: capitalize;
    }
    > span:nth-child(2) {
      color: #1c5de7;
    }
  }
`;

export default NaturePickerWrapper;
