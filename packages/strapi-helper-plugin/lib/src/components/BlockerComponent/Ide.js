import styled from 'styled-components';

const Ide = styled.div`
  padding-top: 2.3rem;

  > div {
    width: 455px;
    color: #787e8f;
    font-size: 12px;

    > pre {
      margin: 10px;
      padding: 10px;
      background: #333;
      color: white;
      border-radius: 0.3rem;
    }

    > ul {
      padding-left: 20px;
      list-style: none;
      > li {
        list-style: none;
      }
    }
  }
`;
export default Ide;
