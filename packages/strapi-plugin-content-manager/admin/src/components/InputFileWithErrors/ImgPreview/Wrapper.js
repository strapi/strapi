import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  height: 162px;
  z-index: 1 !important;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
  text-align: center;
  vertical-align: middle;
  background-color: #333740;
  background-position: center;
  background-repeat: no-repeat !important;
  white-space: nowrap;

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
    svg {
      margin: auto;
    }
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
