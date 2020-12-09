import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  margin-bottom: 6px;
  justify-content: flex-end;
  /* TODO: temporary until update in buffet.js */
  > div {
    > div {
      left: auto;
      right: 0 !important;
    }
  }
`;

export default Wrapper;
