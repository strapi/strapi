import React from 'react';
import { render } from '@testing-library/react';
import LanguageProvider from '../../LanguageProvider';
import en from '../../../translations/en.json';
import LocaleToggle from '../index';

const messages = { en };
const localeNames = { en: 'English' };

describe('<LocaleToggle />', () => {
  it('should not crash', () => {
    const App = (
      <LanguageProvider messages={messages} localeNames={localeNames}>
        <LocaleToggle />
      </LanguageProvider>
    );

    const { container } = render(App);
    expect(container.firstChild).toMatchInlineSnapshot(`
      .c0 {
        -webkit-font-smoothing: antialiased;
      }

      .c0 > div {
        height: 6rem;
        line-height: 5.8rem;
        z-index: 999;
      }

      .c0 > div > button {
        width: 100%;
        padding: 0 30px;
        background: transparent;
        border: none;
        border-radius: 0;
        color: #333740;
        font-weight: 500;
        text-align: right;
        cursor: pointer;
        -webkit-transition: background 0.2s ease-out;
        transition: background 0.2s ease-out;
      }

      .c0 > div > button:hover,
      .c0 > div > button:focus,
      .c0 > div > button:active {
        color: #333740;
        background-color: #fafafb !important;
      }

      .c0 > div > button > i,
      .c0 > div > button > svg {
        margin-left: 10px;
        -webkit-transition: -webkit-transform 0.3s ease-out;
        -webkit-transition: transform 0.3s ease-out;
        transition: transform 0.3s ease-out;
      }

      .c0 > div > button > i[alt='true'],
      .c0 > div > button > svg[alt='true'] {
        -webkit-transform: rotateX(180deg);
        -ms-transform: rotateX(180deg);
        transform: rotateX(180deg);
      }

      .c0 .localeDropdownContent {
        -webkit-font-smoothing: antialiased;
      }

      .c0 .localeDropdownContent span {
        color: #333740;
        font-size: 13px;
        font-family: Lato;
        font-weight: 500;
        -webkit-letter-spacing: 0.5;
        -moz-letter-spacing: 0.5;
        -ms-letter-spacing: 0.5;
        letter-spacing: 0.5;
        vertical-align: baseline;
      }

      .c0 .localeDropdownMenu {
        min-width: 90px !important;
        max-height: 162px !important;
        overflow: auto !important;
        margin: 0 !important;
        padding: 0;
        line-height: 1.8rem;
        border: none !important;
        border-top-left-radius: 0 !important;
        border-top-right-radius: 0 !important;
        box-shadow: 0 1px 4px 0px rgba(40,42,49,0.05);
      }

      .c0 .localeDropdownMenu:before {
        content: '';
        position: absolute;
        top: -3px;
        left: -1px;
        width: calc(100% + 1px);
        height: 3px;
        box-shadow: 0 1px 2px 0 rgba(40,42,49,0.16);
      }

      .c0 .localeDropdownMenu > button {
        height: 40px;
        padding: 0px 15px;
        line-height: 40px;
        color: #f75b1d;
        font-size: 13px;
        font-weight: 500;
        -webkit-letter-spacing: 0.5;
        -moz-letter-spacing: 0.5;
        -ms-letter-spacing: 0.5;
        letter-spacing: 0.5;
      }

      .c0 .localeDropdownMenu > button:hover,
      .c0 .localeDropdownMenu > button:focus,
      .c0 .localeDropdownMenu > button:active {
        background-color: #fafafb !important;
        border-radius: 0px;
        cursor: pointer;
      }

      .c0 .localeDropdownMenu > button:first-child {
        line-height: 50px;
        margin-bottom: 4px;
      }

      .c0 .localeDropdownMenu > button:first-child:hover,
      .c0 .localeDropdownMenu > button:first-child:active {
        color: #333740;
      }

      .c0 .localeDropdownMenu > button:not(:first-child) {
        height: 36px;
        line-height: 36px;
      }

      .c0 .localeDropdownMenu > button:not(:first-child) > i,
      .c0 .localeDropdownMenu > button:not(:first-child) > svg {
        margin-left: 10px;
      }

      .c0 .localeDropdownMenuNotLogged {
        background: transparent !important;
        box-shadow: none !important;
        border: 1px solid #e3e9f3 !important;
        border-top: 0px !important;
      }

      .c0 .localeDropdownMenuNotLogged button {
        padding-left: 17px;
      }

      .c0 .localeDropdownMenuNotLogged button:hover {
        background-color: #f7f8f8 !important;
      }

      .c0 .localeDropdownMenuNotLogged:before {
        box-shadow: none !important;
      }

      .c0 .localeToggleItem img {
        max-height: 13.37px;
        margin-left: 9px;
      }

      .c0 .localeToggleItem:active {
        color: black;
      }

      .c0 .localeToggleItem:hover {
        background-color: #fafafb !important;
      }

      .c0 .localeToggleItemActive {
        color: #333740 !important;
      }

      <div
        class="c0"
      >
        <div
          class="btn-group"
        >
          <button
            aria-expanded="false"
            aria-haspopup="true"
            class="localeDropdownContent btn btn-secondary"
            type="button"
          >
            <span>
              English
            </span>
          </button>
          <div
            aria-hidden="true"
            class="localeDropdownMenu dropdown-menu"
            role="menu"
            tabindex="-1"
          >
            <button
              class="localeToggleItem localeToggleItemActive dropdown-item"
              role="menuitem"
              tabindex="0"
              type="button"
            >
              English
            </button>
          </div>
        </div>
      </div>
    `);
  });
});
