import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  margin-top: 25px;
  padding: 0;

  .btn-wrapper {
    position: absolute;
    top: 161px;
    height: 100px;
    width: 100%;
    margin-left: -50px;
    margin-top: -50px;
    text-align: center;

    > p {
      line-height: 18px;
    }
    .title {
      margin-bottom: 2px;

      font-size: 18px;
      font-weight: 500;
    }
    .subtitle {
      font-size: 13px;
    }
  }
`;

export default Wrapper;
