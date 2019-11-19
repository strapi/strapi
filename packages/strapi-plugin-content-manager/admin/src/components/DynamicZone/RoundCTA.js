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
  &:hover {
    background-color: #faa684;
    color: #f64d0a;
  }
`;

export default RoundCTA;
