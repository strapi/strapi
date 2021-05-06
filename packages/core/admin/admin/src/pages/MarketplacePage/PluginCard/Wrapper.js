import styled from 'styled-components';

const Wrapper = styled.div`
  .wrapper {
    position: relative;
    min-height: 216px;
    margin-bottom: 3.6rem;
    padding: 1.2rem 1.5rem;
    padding-bottom: 0;
    background-color: #fff;
    box-shadow: 0 2px 4px #e3e9f3;
    -webkit-font-smoothing: antialiased;
  }

  .cardTitle {
    display: flex;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    > div:first-child {
      margin-right: 14px;
    }

    > div:last-child {
      height: 36px;
      line-height: 36px;
    }

    i,
    svg {
      margin-left: 7px;
      color: #b3b5b9;
      font-size: 1rem;
      vertical-align: baseline;
      cursor: pointer;
    }
  }

  .cardDescription {
    height: 54px;
    margin-top: 27px;
    margin-bottom: 9px;
    font-size: 13px;
    font-weight: 400;

    > span:last-child {
      color: #1c5de7;
    }
    -webkit-font-smoothing: antialiased;
  }

  .cardFooter {
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    width: 100%;
    height: 45px;
    padding: 0.9rem 1.5rem 1rem;
    background-color: #fafafb;
    justify-content: space-between;
    flex-direction: row-reverse;
    cursor: initial;
  }

  .compatible {
    margin-top: 3px;
    color: #5a9e06;
    font-size: 1.3rem;
    font-style: italic;

    > i,
    > svg {
      margin-right: 7px;
      font-size: 12px;
    }
  }

  .settings {
    margin-top: 3px;
    color: #323740;
    font-size: 1.3rem;
    font-weight: 500;
    cursor: pointer;

    > i,
    > svg {
      margin-right: 7px;
      font-size: 11px;
      vertical-align: inherit;
    }
  }

  .button {
    height: 26px;
    min-width: 89px !important;
    padding: 0 15px;
    margin: 0;
    border-radius: 2px !important;
    line-height: 23px;
    font-size: 13px;
    cursor: pointer;
    span {
      display: inline-block;
      width: 100%;
      height: 100%;
    }
  }

  .frame {
    width: 70px;
    height: 36px;
    margin: auto 0;
    text-align: center;
    border: 1px solid #f3f3f7;
    border-radius: 3px;
    white-space: nowrap;
    > img {
      max-height: 36px;
      vertical-align: middle;
    }
  }

  .helper {
    display: inline-block;
    height: 100%;
    vertical-align: middle;
  }
  .primary {
    background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
    color: white;
    font-weight: 500;
    -webkit-font-smoothing: antialiased;

    &:active {
      box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.15);
    }
  }

  .secondary {
    border: 1px solid #dfe0e1;
    font-weight: 600;
  }
`;

export default Wrapper;
