import styled from 'styled-components';

const Wrapper = styled.div`
  .inputFile {
    overflow: hidden;
    position: absolute;
    z-index: -1;
    opacity: 0;
  }

  .buttonContainer {
    width: 100%;
    height: 34px;
    padding-top: 13px;
    text-align: center;
    background-color: #fafafb;
    border-top: 0;
    border-bottom-left-radius: 2px;
    border-bottom-right-radius: 2px;
    color: #333740;
    font-size: 12px;
    font-weight: 700;
    -webkit-font-smoothing: antialiased;

    cursor: pointer;
    text-transform: uppercase;
    > i,
    > svg {
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
