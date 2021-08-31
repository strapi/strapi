import styled from 'styled-components';

const ComponentIcon = styled.div`
  position: absolute;
  top: -16px;
  left: 10px;
  display: flex;

  > .component_name {
    overflow: hidden;
    position: relative;
    width: auto;
    height: 31px;
    padding: 0 11px 0 39px;
    color: #007eff;
    font-size: 13px;
    font-weight: 600;
    line-height: 26px;
    border-radius: 31px;
    border: 2px solid white;
    background-color: #e6f0fb;

    .component_icon {
      z-index: 1;
      display: flex;
      position: absolute;
      top: -1px;
      left: -1px;
      width: 29px;
      height: 29px;
      border-radius: 31px;
      border: 1px solid white;
      background-color: #e6f0fb;

      svg {
        margin: auto;
        color: #007eff;
        font-size: 11px;
      }
    }
  }
`;

export default ComponentIcon;
