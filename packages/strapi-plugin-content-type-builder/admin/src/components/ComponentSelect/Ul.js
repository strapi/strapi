import styled from 'styled-components';

const Ul = styled.ul`
  background-color: #fff;
  list-style: none;
  > li {
    label {
      cursor: pointer;
    }

    .check-wrapper {
      z-index: 9;
      > input {
        z-index: 1;
      }
    }
  }
`;

export default Ul;
