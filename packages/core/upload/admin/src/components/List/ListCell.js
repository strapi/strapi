import styled from 'styled-components';

const ListCell = styled.div`
  width: 100%;
  display: inline-block;
  padding-left: 15px;
  padding-right: 15px;
  @media only screen and (min-width: 768px) {
    width: 50%;
  }
  @media only screen and (min-width: 1024px) {
    width: 25%;
  }
  @media only screen and (min-width: 1280px) {
    max-width: 248px;
  }
`;

export default ListCell;
