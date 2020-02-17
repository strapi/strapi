import styled from 'styled-components';

const Content = styled.div`
  display: flex;

  .icoContainer {
    width: 70px;
    height: 36px;
    position: relative;
    margin: auto 0;
    text-align: center;
    background: #FAFAFB;
    border: 1px solid #F3F3F7;
    border-radius: 3px;
    font-size: 20px;

    > img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      margin: auto;
    }

    .icoWrapper {
      display: flex;
      align-items: center;
      height: 100%;
      flex-direction: column;
      justify-content: space-around;
    }

    .pluginContent {
      text-align: left !important;
      > span:first-child {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.7px;
        text-transform: uppercase;
      }
      > span:last-child {
        font-size: 13px;

      }
    }
`;

export default Content;
