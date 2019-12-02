import styled from 'styled-components';

const RoundCTA = styled.div`
  position: absolute;
  height: 27px;
  width: 27px;
  border-radius: 50%;
  background-color: #f2f3f4;
  border: 2px solid #ffffff;
  z-index: 9;
  cursor: pointer;
  display: flex;
  svg {
    font-size: 9px;
    line-height: 27px;
    margin: auto;
  }
  &:not(.arrow-btn):hover {
    background-color: #faa684;
    color: #f64d0a;
  }
  &.arrow-btn {
    height: 22px;
    width: 22px;
    background-color: #ffffff;
    border: 2px solid #ffffff;
    &:hover {
      background-color: #f2f3f4;
    }
  }
`;

export default RoundCTA;
