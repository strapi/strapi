import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;

  label {
    font-size: 1.3rem;
    font-weight: 500;
    margin-top: 3px;
  }

  nav + div {
    height: 34px;
    margin: 3px 0 26px;

    > div {
      box-shadow: none !important;
      border-color: #e3e9f3 !important;

      > span:first-of-type {
        > div:first-of-type {
          color: #9ea7b8;
        }
      }

      > span:last-of-type {
        span {
          border-color: #b3b5b9 transparent transparent;
        }
      }
    }
  }
`;

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;

  a {
    color: #007eff !important;
    font-size: 1.3rem;
    padding-top: 3px;

    &:hover {
      text-decoration: underline !important;
      cursor: pointer;
    }
  }
`;

export { Nav, Wrapper };
