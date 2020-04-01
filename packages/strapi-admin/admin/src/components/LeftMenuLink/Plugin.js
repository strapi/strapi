import styled from 'styled-components';

const Plugin = styled.div`
  cursor: pointer;
  position: absolute;
  top: 10px;
  left: calc(100% - 4px);
  display: inline-block;
  width: auto;
  height: 20px;
  transition: right 1s ease-in-out;

  span {
    display: inline-block;
    overflow: hidden;
    width: auto;
    height: 20px;
    padding: 0 14px 0 10px;
    color: #ffffff;
    font-size: 12px;
    line-height: 20px;
    background: #0097f7;
    border-radius: 3px;
    transition: transform 0.3s ease-in-out;
    white-space: pre;

    &:hover {
      transform: translateX(calc(-100% + 9px));
    }
  }
`;

export default Plugin;
