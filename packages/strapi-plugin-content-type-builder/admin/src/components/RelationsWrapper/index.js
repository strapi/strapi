import styled from 'styled-components';

const RelationsWrapper = styled.div`
  width: 100%;
  .relation-base {
    display: flex;
    padding: 2.7rem 1.5rem 3.3rem 1.5rem;
    justify-content: space-between;
  }
  .relation-advanced {
    .row {
      margin: 0;
    }
    hr {
      width: 100%;
      margin: 1.3rem 1.5rem 2.1rem 1.5rem;
      height: 1px;
      background-color: rgba(14, 22, 34, 0.04);
      border: 0;
    }
  }
`;

export default RelationsWrapper;
