import styled from 'styled-components';

const SelectNav = styled.nav`
  > div {
    display: flex;

    justify-content: space-between;

    a {
      color: #007eff !important;
      font-size: 1.3rem;

      &:hover {
        text-decoration: underline !important;
        cursor: pointer;
      }
    }
  }
  .description {
    color: #9ea7b8;
    font-family: 'Lato';
    font-size: 1.2rem;
    margin-top: -5px;
  }
`;

export default SelectNav;
