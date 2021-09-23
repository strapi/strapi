import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  height: 30px;
  margin-bottom: 6px;
  margin-right: 10px;
  padding-left: 10px;
  background: rgba(0, 126, 255, 0.08);
  border: 1px solid rgba(0, 126, 255, 0.24);
  border-radius: 2px;
  line-height: 28px;
  color: #007eff;
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
  > span:nth-child(2) {
    font-weight: 700;
  }
`;

export default Wrapper;
