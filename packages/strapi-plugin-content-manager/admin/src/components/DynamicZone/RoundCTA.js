import styled from 'styled-components';

const RoundCTA = styled.div`
  height: 29px;
  width: 29px;
  border-radius: 50%;
  background-color: #f2f3f4;
  border: 2px solid #ffffff;
  cursor: pointer;
  display: flex;
  z-index: 9;
  svg {
    font-size: 10px;
    line-height: 29px;
    margin: auto;
  }
  &:not(.arrow-btn) {
    position: absolute;
    top: -15px;
    right: 10px;
    transition: all 200ms ease-in;
    &:hover {
      background-color: #faa684;
      color: #f64d0a;
    }
  }
  &.arrow-btn {
    height: 24px;
    width: 24px;
    background-color: #ffffff;
    border: 2px solid #ffffff;
    svg {
      font-size: 10px;
      line-height: 24px;
    }
    &:hover {
      background-color: #f2f3f4;
    }
    &.arrow-down {
      transform: rotate(180deg);
    }
  }
`;

export default RoundCTA;
