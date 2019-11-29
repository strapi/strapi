import styled from 'styled-components';

const Wrapper = styled.div`
  > div {
    width: 100%;
    > button {
      position: relative;
      width: 100%;
      font-size: 1.4rem;
      line-height: 3.6rem;
      background-color: transparent;
      border: none;
      cursor: pointer;
      text-transform: capitalize;
      color: black;
      &:focus,
      &:active,
      &:hover,
      &:visited {
        background-color: transparent !important;
        box-shadow: none;
        color: black;
      }
      &:after {
        position: absolute;
        top: calc(50% - 0.1rem);
        right: 1.5rem;
      }
      > p {
        margin-top: -1px;
        margin-bottom: 0;
        padding: 0 20px 0 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        > i,
        > svg {
          margin-right: 8px;
        }
        span {
          font-style: italic;
          font-weight: 500;
        }
      }
    }
    // Dropdown List
    > button + div {
      max-width: 100%;
      max-height: 180px;
      width: 100%;
      margin-top: -4px;
      padding: 0;
      border-radius: 0;
      overflow: scroll;
      > button {
        height: 3.6rem;
        border-bottom: 1px solid #f6f6f6;
        font-size: 1.3rem;
        font-family: Lato;
        font-weight: 400;
        font-family: Lato;
        text-transform: capitalize;
        -webkit-font-smoothing: antialiased;
        cursor: pointer;
        &:focus,
        &:active {
          outline: 0;
          background-color: rgb(255, 255, 255) !important;
          color: rgba(50, 55, 64, 0.75);
        }
        > p {
          color: rgba(50, 55, 64, 0.75);
          line-height: 3rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          i,
          svg {
            margin-right: 10px;
          }
          span {
            font-style: italic;
          }
        }
      }
    }
  }
`;

export default Wrapper;
