import styled from 'styled-components';

const Wrapper = styled.div`
  height: 162px;
  width: 100%;
  position: relative;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
  text-align: center;
  vertical-align: middle;
  background-color: #333740;
  background-position: center;
  background-repeat: no-repeat !important;
  white-space: nowrap;
  z-index: 1 !important;

  > img {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    margin: auto;
    max-width: 100%;
    max-height: 100%;
    z-index: 3;
  }

  .fileIcon {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: #fff;
    justify-content: space-around;
    font-size: 30px;
  }

  .overlay {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    height: 162px;
    z-index: 999;
    background: #333740;
    opacity: 0.9;
  }
`;

export default Wrapper;
