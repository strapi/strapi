import styled from 'styled-components';

const Wrapper = styled.div`
  .inputFile {
    opacity: 0;
    overflow: hidden;
    position: absolute;
    z-index: -1;
  }

  .buttonContainer {
    width: 100%;
    height: 34px;
    text-align: center;
    background-color: #fafafb;
    border-top: 0;
    border-bottom-left-radius: 2px;
    border-bottom-right-radius: 2px;
    color: #333740;
    font-size: 12px;
    font-weight: 700;
    -webkit-font-smoothing: antialiased;
    line-height: 35px;
    cursor: pointer;
    text-transform: uppercase;
    > i {
      margin-right: 10px;
    }
  }

  .copy {
    cursor: copy !important;
  }

  .inputFileControlForm {
    padding: 0;
    height: auto;
  }
`;

export default Wrapper;
