import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  padding-top: 5px;
  text-align: center;
  .info {
    position: absolute;
    display: none;
    top: 10px;
    left: calc(50% + 28px);
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
    margin-top: 4px;
    margin-bottom: -5px;
  }
`;

export default Wrapper;
