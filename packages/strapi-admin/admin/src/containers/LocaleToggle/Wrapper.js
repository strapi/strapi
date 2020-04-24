import styled from 'styled-components';

const Wrapper = styled.div`
  min-width: 90px;
  -webkit-font-smoothing: antialiased;

  > div {
    height: 6rem;
    width: 90px;
    line-height: 5.8rem;
    z-index: 999;
    > button {
      width: 100%;
      padding-right: 30px;
      background: transparent;
      border: none;
      border-radius: 0;
      color: #333740;
      font-weight: 500;
      text-align: right;
      cursor: pointer;
      transition: background 0.2s ease-out;

      &:hover,
      &:focus,
      &:active {
        color: #333740;
        background-color: #fafafb !important;
      }

      > i,
      > svg {
        margin-left: 10px;
        transition: transform 0.3s ease-out;

        &[alt='true'] {
          transform: rotateX(180deg);
        }
      }
    }
  }

  .localeDropdownContent {
    -webkit-font-smoothing: antialiased;
    span {
      color: #333740;
      font-size: 11px;
      font-family: Lato;
      font-weight: 600;
      letter-spacing: 0.5;
      text-transform: uppercase;
      vertical-align: baseline;
    }

    img {
      max-height: 13px;
      margin-left: 9px;
      border-radius: 1px;
      vertical-align: middle;
    }
  }

  .localeDropdownMenu {
    left: auto !important;
    right: -5px !important;
    min-width: 90px !important;
    max-height: 162px !important;
    overflow: auto !important;
    margin: 0 !important;
    padding: 0;
    line-height: 1.8rem;
    border: none !important;
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
    box-shadow: 0 1px 4px 0px rgba(40, 42, 49, 0.05);

    &:before {
      content: '';
      position: absolute;
      top: -3px;
      left: -1px;
      width: calc(100% + 1px);
      height: 3px;
      box-shadow: 0 1px 2px 0 rgba(40, 42, 49, 0.16);
    }

    > button {
      height: 40px;
      padding: 0px 15px;
      line-height: 40px;
      color: #f75b1d;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.5;
      &:hover,
      &:focus,
      &:active {
        background-color: #fafafb !important;
        border-radius: 0px;
        cursor: pointer;
      }
    }

    > button:first-child {
      line-height: 50px;
      margin-bottom: 4px;
      &:hover,
      &:active {
        color: #333740;
      }
    }

    > button:not(:first-child) {
      height: 36px;
      line-height: 36px;
      > i,
      > svg {
        margin-left: 10px;
      }
    }
  }

  .localeDropdownMenuNotLogged {
    background: transparent !important;
    box-shadow: none !important;
    border: 1px solid #e3e9f3 !important;
    border-top: 0px !important;

    button {
      padding-left: 17px;
      &:hover {
        background-color: #f7f8f8 !important;
      }
    }

    &:before {
      box-shadow: none !important;
    }
  }

  .localeToggleItem {
    img {
      max-height: 13.37px;
      margin-left: 9px;
    }
    &:active {
      color: black;
    }
    &:hover {
      background-color: #fafafb !important;
    }
  }

  .localeToggleItemActive {
    color: #333740 !important;
  }
`;

export default Wrapper;
