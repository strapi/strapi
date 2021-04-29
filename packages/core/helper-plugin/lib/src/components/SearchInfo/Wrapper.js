import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  height: 22px;
  margin: auto;
  margin-top: 19px;
  margin-left: 20px;
  padding-right: 10px;
  padding-left: 30px;
  background: rgba(0, 126, 255, 0.08);
  border: 1px solid rgba(0, 126, 255, 0.24);
  border-radius: 2px;
  color: #007eff;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  > svg {
    position: absolute;
    top: 1px;
    margin: auto;
    bottom: 0;
    left: 11px;
    height: 7px;
  }
`;

export default Wrapper;
