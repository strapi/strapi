import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  margin-bottom: 27px;

  label {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 1.3rem;
    font-weight: 500;
  }

  nav + div {
    height: 34px;
    background-color: white;
    margin-top: 5px;
    > div {
      min-height: 34px;
      height: 100%;
      border: 1px solid #e3e9f3;
      border-radius: 3px;
      box-shadow: 0 1px 1px 0 rgba(104, 118, 142, 0.05);
      flex-wrap: initial;
      padding: 0 10px;

      // Arrow
      &:before {
        content: '\f0d7';
        position: absolute;
        top: 5px;
        right: 10px;
        font-family: 'FontAwesome';
        font-size: 14px;
        font-weight: 800;
        color: #aaa;
      }
      > div {
        padding: 0;
        &:first-of-type {
          // Placeholder
          > div span {
            color: #aaa;
          }
        }
      }
      div:last-of-type {
        span {
          display: none;
          & + div {
            display: none;
          }
        }
        svg {
          width: 15px;
          margin-right: 6px;
        }
      }
      span {
        font-size: 13px;
        line-height: 34px;
        color: #333740;
      }
      :hover {
        cursor: pointer;
        border-color: #e3e9f3;
        &:before {
          color: #666;
        }
      }
    }
    span[aria-live='polite'] + div {
      &:before {
        transform: rotate(180deg);
        top: 4px;
      }
      & + div {
        z-index: 2;
        height: fit-content;
        padding: 0;
        margin-top: -2px;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        &:before {
          content: '';
        }
        div {
          width: 100%;
        }
        > div {
          max-height: 200px;
          height: fit-content;
          div {
            height: 36px;
            cursor: pointer;
          }
        }
      }
    }
  }
`;

const Nav = styled.nav`
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
    max-width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
`;

export { Nav, Wrapper };
