import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  margin: 18px 0;
  text-align: center;

  .info {
    position: absolute;
    display: ${({ show }) => (show ? 'block' : 'none')};
    top: 25%;
    left: calc(50% + 46px);
    > span {
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #007eff;
      font-size: 11px;
      font-weight: 700;
    }
  }
`;

export default Wrapper;
