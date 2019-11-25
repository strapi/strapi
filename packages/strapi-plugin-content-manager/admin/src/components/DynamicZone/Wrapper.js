import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  margin: 24px 0 0 0;
  padding-bottom: 23px;
  & + & {
    padding-bottom: 9px;
  }
  text-align: center;
  .info {
    position: absolute;
    display: none;
    top: 10px;
    left: calc(50% + 46px);
    > span {
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #007eff;
      font-size: 11px;
      font-weight: 700;
    }
  }
  button {
    &:not(.isOpen):hover + .info {
      display: block;
    }
  }
  .error-label {
    color: #f64d0a;
    font-size: 13px;
    margin-top: 9px;
    margin-bottom: -10px;
  }
`;

export default Wrapper;
