import * as React from 'react';
import { IntlProvider } from 'react-intl';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@strapi/design-system/ThemeProvider';
import { lightTheme } from '@strapi/design-system/themes';
import Wysiwyg from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useLibrary: () => ({ components: {} }),
}));

document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = jest.fn();
  range.getClientRects = jest.fn(() => ({
    item: () => null,
    length: 0,
  }));

  return range;
};
window.focus = jest.fn();

describe('Wysiwyg render and actions buttons', () => {
  let renderedContainer;
  let getContainerByText;
  let containerQueryByText;
  let returnedValue;

  beforeEach(() => {
    const onChange = jest.fn((e) => {
      returnedValue = e.target.value;
    });

    const { container, getByText, queryByText } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider messages={{}} locale="en">
          <Wysiwyg
            name="rich-text"
            intlLabel={{ id: 'hello world', defaultMessage: 'hello world' }}
            onChange={onChange}
            disabled={false}
          />
        </IntlProvider>
      </ThemeProvider>
    );
    renderedContainer = container;
    getContainerByText = getByText;
    containerQueryByText = queryByText;
  });

  it('should render the Wysiwyg', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));

    expect(getContainerByText('hello world')).toBeInTheDocument();
    expect(renderedContainer.firstChild).toMatchInlineSnapshot(`
      .c6 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c15 {
        color: #666687;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c32 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c7 {
        border-radius: 4px;
        border-style: solid;
        border-width: 1px;
        border-color: #dcdce4;
      }

      .c8 {
        background: #f6f6f9;
        padding: 8px;
      }

      .c14 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c16 {
        padding-left: 12px;
      }

      .c29 {
        background: #f6f6f9;
        padding: 8px;
        border-radius: 4px;
      }

      .c1 {
        -webkit-align-items: stretch;
        -webkit-box-align: stretch;
        -ms-flex-align: stretch;
        align-items: stretch;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c3 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
      }

      .c9 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
      }

      .c30 {
        -webkit-align-items: flex-end;
        -webkit-box-align: flex-end;
        -ms-flex-align: flex-end;
        align-items: flex-end;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: end;
        -webkit-justify-content: flex-end;
        -ms-flex-pack: end;
        justify-content: flex-end;
      }

      .c2 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c2 > * + * {
        margin-top: 4px;
      }

      .c10 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c4 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c4 > * + * {
        margin-left: 4px;
      }

      .c21 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        background: #ffffff;
        border: 1px solid #dcdce4;
        position: relative;
        outline: none;
      }

      .c21 svg {
        height: 12px;
        width: 12px;
      }

      .c21 svg > g,
      .c21 svg path {
        fill: #ffffff;
      }

      .c21[aria-disabled='true'] {
        pointer-events: none;
      }

      .c21:after {
        -webkit-transition-property: all;
        transition-property: all;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -4px;
        bottom: -4px;
        left: -4px;
        right: -4px;
        border: 2px solid transparent;
      }

      .c21:focus-visible {
        outline: none;
      }

      .c21:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c26 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c26 .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c26 .c5 {
        color: #ffffff;
      }

      .c26[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c26[aria-disabled='true'] .c5 {
        color: #666687;
      }

      .c26[aria-disabled='true'] svg > g,
      .c26[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c26[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c26[aria-disabled='true']:active .c5 {
        color: #666687;
      }

      .c26[aria-disabled='true']:active svg > g,
      .c26[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c26:hover {
        background-color: #f6f6f9;
      }

      .c26:active {
        background-color: #eaeaef;
      }

      .c26 .c5 {
        color: #32324d;
      }

      .c26 svg > g,
      .c26 svg path {
        fill: #32324d;
      }

      .c23 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
        height: 2rem;
        width: 2rem;
      }

      .c23 svg > g,
      .c23 svg path {
        fill: #8e8ea9;
      }

      .c23:hover svg > g,
      .c23:hover svg path {
        fill: #666687;
      }

      .c23:active svg > g,
      .c23:active svg path {
        fill: #a5a5ba;
      }

      .c23[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c23[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c19 span:first-child button {
        border-left: 1px solid #dcdce4;
        border-radius: 4px 0 0 4px;
      }

      .c19 span:last-child button {
        border-radius: 0 4px 4px 0;
      }

      .c19 .c22 {
        border-radius: 0;
        border-left: none;
      }

      .c19 .c22 svg path {
        fill: #4a4a6a;
      }

      .c19 .c22:hover {
        background-color: #f6f6f9;
      }

      .c19 .c22:hover svg path {
        fill: #32324d;
      }

      .c19 .c22:active {
        background-color: #eaeaef;
      }

      .c19 .c22:active svg path {
        fill: #212134;
      }

      .c19 .c22[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c12 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c12:focus {
        outline: none;
      }

      .c12[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .c11 {
        position: relative;
        border: 1px solid #dcdce4;
        padding-right: 12px;
        border-radius: 4px;
        background: #ffffff;
        overflow: hidden;
        min-height: 2rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c11:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c17 {
        background: transparent;
        border: none;
        position: relative;
        z-index: 1;
      }

      .c17 svg {
        height: 0.6875rem;
        width: 0.6875rem;
      }

      .c17 svg path {
        fill: #666687;
      }

      .c18 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        background: none;
        border: none;
      }

      .c18 svg {
        width: 0.375rem;
      }

      .c13 {
        width: 100%;
      }

      .c28 {
        cursor: auto;
        height: 100%;
      }

      .c28 .CodeMirror-placeholder {
        color: #666687 !important;
      }

      .c28 .CodeMirror {
        font-size: 0.875rem;
        height: 290px;
        color: #32324d;
        direction: ltr;
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell, 'Open Sans','Helvetica Neue',sans-serif;
      }

      .c28 .CodeMirror-lines {
        padding: 12px 16px;
      }

      .c28 .CodeMirror-scrollbar-filler,
      .c28 .CodeMirror-gutter-filler {
        background-color: #ffffff;
      }

      .c28 .CodeMirror-gutters {
        border-right: 1px solid #ddd;
        background-color: #f7f7f7;
        white-space: nowrap;
      }

      .c28 .CodeMirror-linenumber {
        padding: 0 3px 0 5px;
        min-width: 20px;
        text-align: right;
        color: #999;
        white-space: nowrap;
      }

      .c28 .CodeMirror-guttermarker {
        color: black;
      }

      .c28 .CodeMirror-guttermarker-subtle {
        color: #999;
      }

      .c28 .CodeMirror-cursor {
        border-left: 1px solid black;
        border-right: none;
        width: 0;
      }

      .c28 .CodeMirror div.CodeMirror-secondarycursor {
        border-left: 1px solid silver;
      }

      .c28 .cm-fat-cursor .CodeMirror-cursor {
        width: auto;
        border: 0 !important;
        background: #7e7;
      }

      .c28 .cm-fat-cursor-mark {
        background-color: rgba(20,255,20,0.5);
        -webkit-animation: blink 1.06s steps(1) infinite;
        -moz-animation: blink 1.06s steps(1) infinite;
        -webkit-animation: blink 1.06s steps(1) infinite;
        animation: blink 1.06s steps(1) infinite;
      }

      .c28 .cm-animate-fat-cursor {
        width: auto;
        border: 0;
        -webkit-animation: blink 1.06s steps(1) infinite;
        -moz-animation: blink 1.06s steps(1) infinite;
        -webkit-animation: blink 1.06s steps(1) infinite;
        animation: blink 1.06s steps(1) infinite;
        background-color: #7e7;
      }

      .c28 .cm-tab {
        display: inline-block;
        -webkit-text-decoration: inherit;
        text-decoration: inherit;
      }

      .c28 .CodeMirror-rulers {
        position: absolute;
        left: 0;
        right: 0;
        top: -50px;
        bottom: 0;
        overflow: hidden;
      }

      .c28 .CodeMirror-ruler {
        border-left: 1px solid #ccc;
        top: 0;
        bottom: 0;
        position: absolute;
      }

      .c28 .cm-header,
      .c28 .cm-strong {
        font-weight: bold;
      }

      .c28 .cm-em {
        font-style: italic;
      }

      .c28 .cm-link {
        -webkit-text-decoration: underline;
        text-decoration: underline;
      }

      .c28 .cm-strikethrough {
        -webkit-text-decoration: line-through;
        text-decoration: line-through;
      }

      .c28 .CodeMirror-composing {
        border-bottom: 2px solid;
      }

      .c28 div.CodeMirror span.CodeMirror-matchingbracket {
        color: #0b0;
      }

      .c28 div.CodeMirror span.CodeMirror-nonmatchingbracket {
        color: #a22;
      }

      .c28 .CodeMirror-matchingtag {
        background: rgba(255,150,0,0.3);
      }

      .c28 .CodeMirror-activeline-background {
        background: #e8f2ff;
      }

      .c28 .CodeMirror {
        position: relative;
        overflow: hidden;
        background: #ffffff;
      }

      .c28 .CodeMirror-scroll {
        overflow: scroll !important;
        margin-bottom: -50px;
        margin-right: -50px;
        padding-bottom: 50px;
        height: 100%;
        outline: none;
        position: relative;
      }

      .c28 .CodeMirror-sizer {
        position: relative;
        border-right: 50px solid transparent;
      }

      .c28 .CodeMirror-vscrollbar,
      .c28 .CodeMirror-hscrollbar,
      .c28 .CodeMirror-scrollbar-filler,
      .c28 .CodeMirror-gutter-filler {
        position: absolute;
        z-index: 1;
        display: none;
        outline: none;
      }

      .c28 .CodeMirror-vscrollbar {
        right: 0;
        top: 0;
        overflow-x: hidden;
        overflow-y: scroll;
      }

      .c28 .CodeMirror-hscrollbar {
        bottom: 0;
        left: 0;
        overflow-y: hidden;
        overflow-x: scroll;
      }

      .c28 .CodeMirror-scrollbar-filler {
        right: 0;
        bottom: 0;
      }

      .c28 .CodeMirror-lines {
        cursor: text;
        min-height: 1px;
      }

      .c28 .CodeMirror pre.CodeMirror-line,
      .c28 .CodeMirror pre.CodeMirror-line-like {
        -moz-border-radius: 0;
        -webkit-border-radius: 0;
        border-radius: 0;
        border-width: 0;
        background: transparent;
        font-family: inherit;
        font-size: inherit;
        margin: 0;
        white-space: pre;
        word-wrap: normal;
        line-height: 1.5;
        color: inherit;
        position: relative;
        overflow: visible;
        -webkit-tap-highlight-color: transparent;
        -webkit-font-variant-ligatures: contextual;
        font-variant-ligatures: contextual;
      }

      .c28 .CodeMirror pre.CodeMirror-line-like {
        z-index: 2;
      }

      .c28 .CodeMirror-wrap pre.CodeMirror-line,
      .c28 .CodeMirror-wrap pre.CodeMirror-line-like {
        word-wrap: break-word;
        white-space: pre-wrap;
        word-break: normal;
      }

      .c28 .CodeMirror-linebackground {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 0;
      }

      .c28 .CodeMirror-linewidget {
        position: relative;
        padding: 0.1px;
      }

      .c28 .CodeMirror-rtl pre {
        direction: rtl;
      }

      .c28 .CodeMirror-code {
        outline: none;
      }

      .c28 .CodeMirror-scroll,
      .c28 .CodeMirror-sizer,
      .c28 .CodeMirror-gutter,
      .c28 .CodeMirror-gutters,
      .c28 .CodeMirror-linenumber {
        -moz-box-sizing: content-box;
        box-sizing: content-box;
      }

      .c28 .CodeMirror-measure {
        position: absolute;
        width: 100%;
        height: 0;
        overflow: hidden;
        visibility: hidden;
      }

      .c28 .CodeMirror-cursor {
        position: absolute;
        pointer-events: none;
        border-color: #32324d;
      }

      .c28 .CodeMirror-measure pre {
        position: static;
      }

      .c28 div.CodeMirror-cursors {
        visibility: hidden;
        position: relative;
      }

      .c28 div.CodeMirror-cursors + div {
        z-index: 0 !important;
      }

      .c28 div.CodeMirror-dragcursors {
        visibility: visible;
      }

      .c28 .CodeMirror-focused div.CodeMirror-cursors {
        visibility: visible;
      }

      .c28 .CodeMirror-selected {
        background: #dcdce4;
      }

      .c28 .CodeMirror-crosshair {
        cursor: crosshair;
      }

      .c28 .cm-force-border {
        padding-right: 0.1px;
      }

      .c28 .cm-tab-wrap-hack:after {
        content: '';
      }

      .c28 span.CodeMirror-selectedtext {
        background: none;
      }

      .c28 span {
        color: #32324d !important;
      }

      .c24 {
        padding: 8px;
        outline-offset: -2px !important;
      }

      .c24 svg {
        width: 1.125rem;
        height: 1.125rem;
      }

      .c20 {
        margin-left: 16px;
      }

      .c25 {
        margin: 0 8px;
        padding: 8px;
      }

      .c25 svg {
        width: 1.125rem;
        height: 1.125rem;
      }

      .c27 {
        position: relative;
        height: calc(100% - 48px);
      }

      .c31 {
        background-color: transparent;
        border: none;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c31 svg {
        margin-left: 8px;
      }

      .c31 svg path {
        fill: #4a4a6a;
        width: 0.75rem;
        height: 0.75rem;
      }

      <div
        class="c0 c1 c2"
        spacing="1"
      >
        <div
          class="c0 c3 c4"
          spacing="1"
        >
          <span
            class="c5 c6"
          >
            hello world
          </span>
        </div>
        <div
          class="c0 c7"
        >
          <div
            class="c0 c8"
          >
            <div
              class="c0 c9"
            >
              <div
                class="c0 c3"
              >
                <div>
                  <div
                    class="c0 c1 c10"
                  >
                    <div
                      class="c0 c3 c11"
                    >
                      <button
                        aria-disabled="false"
                        aria-expanded="false"
                        aria-haspopup="listbox"
                        aria-labelledby="selectTitle-label selectTitle-content"
                        class="c12"
                        id="selectTitle"
                        type="button"
                      />
                      <div
                        class="c0 c9 c13"
                      >
                        <div
                          class="c0 c3"
                        >
                          <div
                            class="c0 c14"
                          >
                            <span
                              class="c5 c15"
                              id="selectTitle-content"
                            >
                              Add a title
                            </span>
                          </div>
                        </div>
                        <div
                          class="c0 c3"
                        >
                          <button
                            aria-hidden="true"
                            class="c0 c16 c17 c18"
                            tabindex="-1"
                            title="Carret Down Button"
                            type="button"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 14 8"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                clip-rule="evenodd"
                                d="M14 .889a.86.86 0 01-.26.625L7.615 7.736A.834.834 0 017 8a.834.834 0 01-.615-.264L.26 1.514A.861.861 0 010 .889c0-.24.087-.45.26-.625A.834.834 0 01.875 0h12.25c.237 0 .442.088.615.264a.86.86 0 01.26.625z"
                                fill="#32324D"
                                fill-rule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c0 c3 c19 c20"
                >
                  <span>
                    <button
                      aria-disabled="false"
                      aria-labelledby="tooltip-1"
                      class="c21 c22 c23 c24"
                      id="Bold"
                      name="Bold"
                      tabindex="0"
                      type="button"
                    >
                      <svg
                        fill="none"
                        height="1em"
                        viewBox="0 0 24 24"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          clip-rule="evenodd"
                          d="M9.778 6H8v12h1.778V6zm6.444 3.333a3.32 3.32 0 01-.85 2.222 3.533 3.533 0 011.517 2.89c0 1.96-1.627 3.555-3.627 3.555H9.778v-1.777h3.484c1.02 0 1.85-.798 1.85-1.778s-.83-1.778-1.85-1.778H9.778v-1.778h3.111c.858 0 1.556-.698 1.556-1.556 0-.857-.698-1.555-1.556-1.555H9.778V6h3.111a3.337 3.337 0 013.333 3.333z"
                          fill="#32324D"
                          fill-rule="evenodd"
                        />
                      </svg>
                    </button>
                  </span>
                  <span>
                    <button
                      aria-disabled="false"
                      aria-labelledby="tooltip-3"
                      class="c21 c22 c23 c24"
                      id="Italic"
                      name="Italic"
                      tabindex="0"
                      type="button"
                    >
                      <svg
                        fill="none"
                        height="1em"
                        viewBox="0 0 24 24"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          clip-rule="evenodd"
                          d="M16.4 6h-5.6v1.6h1.693l-2.253 8.8H8V18h5.6v-1.6h-1.76l2.253-8.8H16.4V6z"
                          fill="#32324D"
                          fill-rule="evenodd"
                        />
                      </svg>
                    </button>
                  </span>
                  <span>
                    <button
                      aria-disabled="false"
                      aria-labelledby="tooltip-5"
                      class="c21 c22 c23 c24"
                      id="Underline"
                      name="Underline"
                      tabindex="0"
                      type="button"
                    >
                      <svg
                        fill="none"
                        height="1em"
                        viewBox="0 0 24 24"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 15.2a4.358 4.358 0 002.992-1.172A3.892 3.892 0 0016.23 11.2V6h-1.693v5.2c0 .636-.267 1.247-.743 1.697A2.615 2.615 0 0112 13.6a2.615 2.615 0 01-1.795-.703 2.336 2.336 0 01-.743-1.697V6H7.769v5.2c0 1.06.446 2.078 1.24 2.828A4.358 4.358 0 0012 15.2zM17.5 16.4h-11V18h11v-1.6z"
                          fill="#32324D"
                        />
                      </svg>
                    </button>
                  </span>
                </div>
                <span>
                  <button
                    aria-disabled="false"
                    aria-labelledby="tooltip-7"
                    class="c21 c22 c23 c25"
                    id="more"
                    tabindex="0"
                    type="button"
                  >
                    <svg
                      fill="none"
                      height="1em"
                      viewBox="0 0 24 24"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7.3 13.8a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12.3 13.8a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.3 13.8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                        fill="#32324D"
                      />
                    </svg>
                  </button>
                </span>
              </div>
              <button
                aria-disabled="false"
                class="c21 c26"
                id="preview"
                type="button"
              >
                <span
                  class="c5 c6"
                >
                  Preview mode
                </span>
              </button>
            </div>
          </div>
          <div
            class="c27"
          >
            <div
              class="c28"
            >
              <textarea
                style="display: none;"
              />
              <div
                class="CodeMirror cm-s-default CodeMirror-wrap"
                translate="no"
              >
                <div
                  class="CodeMirror-vscrollbar"
                  cm-not-content="true"
                  tabindex="-1"
                >
                  <div
                    style="min-width: 1px;"
                  />
                </div>
                <div
                  class="CodeMirror-hscrollbar"
                  cm-not-content="true"
                  tabindex="-1"
                >
                  <div
                    style="height: 100%; min-height: 1px;"
                  />
                </div>
                <div
                  class="CodeMirror-scrollbar-filler"
                  cm-not-content="true"
                />
                <div
                  class="CodeMirror-gutter-filler"
                  cm-not-content="true"
                />
                <div
                  class="CodeMirror-scroll"
                  tabindex="-1"
                >
                  <div
                    class="CodeMirror-sizer"
                    style="margin-left: 0px;"
                  >
                    <div
                      style="position: relative;"
                    >
                      <div
                        class="CodeMirror-lines"
                        role="presentation"
                      >
                        <div
                          role="presentation"
                          style="position: relative; outline: none;"
                        >
                          <div
                            class="CodeMirror-measure"
                          >
                            <pre
                              class="CodeMirror-line-like"
                            >
                              <span>
                                xxxxxxxxxx
                              </span>
                            </pre>
                          </div>
                          <div
                            class="CodeMirror-measure"
                          />
                          <div
                            style="position: relative; z-index: 1;"
                          />
                          <div
                            class="CodeMirror-cursors"
                          />
                          <div
                            aria-label="Editor"
                            autocapitalize="off"
                            autocorrect="off"
                            class="CodeMirror-code"
                            role="presentation"
                            spellcheck="true"
                            tabindex="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    style="position: absolute; height: 50px; width: 1px;"
                  />
                  <div
                    class="CodeMirror-gutters"
                    style="display: none;"
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            class="c0 c29"
          >
            <div
              class="c0 c30"
            >
              <button
                aria-disabled="false"
                class="c21 c31"
                id="expand"
                type="button"
              >
                <span
                  class="c5 c32"
                >
                  Expand
                </span>
                <svg
                  fill="none"
                  height="1em"
                  viewBox="0 0 12 12"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1.371 1.371h2.743V0H0v4.114h1.371V1.371zM7.886 1.371h2.743v2.743H12V0H7.886v1.371zM0 12h4.114v-1.372H1.371V7.885H0v4.114zM10.629 10.628H7.886v1.371H12V7.885h-1.371v2.743z"
                    fill="#32324D"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `);
  });

  it('should render bold markdown when clicking the bold button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#Bold'));

    expect(getContainerByText('**Bold**')).toBeInTheDocument();
  });

  it('should render italic markdown when clicking the italic button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#Italic'));

    expect(getContainerByText('_Italic_')).toBeInTheDocument();
  });

  it('should render underline markdown when clicking the underline button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#Underline'));

    const hasUnderlineMarkdown = getContainerByText((content, node) => {
      const hasText = (node) => node.textContent === '<u>Underline</u>';
      const nodeHasText = hasText(node);
      const childrenDontHaveText = Array.from(node.children).every((child) => !hasText(child));

      return nodeHasText && childrenDontHaveText;
    });

    expect(hasUnderlineMarkdown).toBeInTheDocument();
  });

  it('should render strikethrough markdown when clicking the strikethrough button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('Strikethrough'));

    expect(getContainerByText('~~Strikethrough~~')).toBeInTheDocument();
  });

  it('should render bullet list markdown when clicking the bullet list button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('BulletList'));

    expect(getContainerByText('-')).toBeInTheDocument();
  });

  it('should render number list markdown when clicking the number list button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('NumberList'));

    expect(getContainerByText('1.')).toBeInTheDocument();
  });

  it('should render code markdown when clicking the code button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('Code'));

    const expected = `
\`\`\`
Code
\`\`\``;

    expect(returnedValue).toEqual(expected);
  });

  // it('should render image markdown when clicking the image button', async () => {
  //   await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
  //   fireEvent.click(renderedContainer.querySelector('#more'));
  //   fireEvent.click(document.getElementById('Image'));
  //   fireEvent.click(document.getElementById('media-library'));
  //   fireEvent.click(document.getElementById('insert-button'));

  //   expect(getContainerByText('[sunset](http://localhost:3000/sunsetimage)')).toBeInTheDocument();
  // });

  it('should render link markdown when clicking the link button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('Link'));

    expect(getContainerByText('[Link](link)')).toBeInTheDocument();
  });

  it('should render quote markdown when clicking the quote button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('Quote'));

    expect(getContainerByText('>Quote')).toBeInTheDocument();
  });

  it('should render h1 markdown when clicking the h1 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h1'));

    expect(getContainerByText('#')).toBeInTheDocument();
  });

  it('should render h2 markdown when clicking the h2 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h2'));

    expect(getContainerByText('##')).toBeInTheDocument();
  });

  it('should render h3 markdown when clicking the h3 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h3'));

    expect(getContainerByText('###')).toBeInTheDocument();
  });

  it('should render h4 markdown when clicking the h4 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h4'));

    expect(getContainerByText('####')).toBeInTheDocument();
  });

  it('should render h5 markdown when clicking the h5 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h5'));

    expect(getContainerByText('#####')).toBeInTheDocument();
  });

  it('should render h6 markdown when clicking the h6 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h6'));

    expect(getContainerByText('######')).toBeInTheDocument();
  });

  it('should render h1 markdown when clicking the h4 button then clicking on the h1 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h1'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h4'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h1'));

    expect(containerQueryByText('####')).not.toBeInTheDocument();
    expect(getContainerByText('#')).toBeInTheDocument();
  });

  // PREVIEW MODE TESTS

  it('should disable bold button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#Bold'));

    expect(containerQueryByText('**Bold**')).not.toBeInTheDocument();
  });

  it('should disable italic button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#Italic'));

    expect(containerQueryByText('_Italic_')).not.toBeInTheDocument();
  });

  it('should disable underline button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#Underline'));

    const hasUnderlineMarkdown = containerQueryByText((content, node) => {
      const hasText = (node) => node.textContent === '<u>Underline</u>';
      const nodeHasText = hasText(node);
      const childrenDontHaveText = Array.from(node.children).every((child) => !hasText(child));

      return nodeHasText && childrenDontHaveText;
    });

    expect(hasUnderlineMarkdown).not.toBeInTheDocument();
  });

  it('should disable strikethrough button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('Strikethrough')).not.toBeInTheDocument();
  });

  it('should disable bullet list button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('BulletList')).not.toBeInTheDocument();
  });

  it('should disable number list button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('NumbertList')).not.toBeInTheDocument();
  });

  it('should disable code button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('BulletList')).not.toBeInTheDocument();
  });

  it('should disable image button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('Image')).not.toBeInTheDocument();
  });

  it('should disable link button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('Link')).not.toBeInTheDocument();
  });

  it('should disable quote button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('Quote')).not.toBeInTheDocument();
  });

  it('should disable titles buttons when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));

    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    expect(document.getElementById('h1')).not.toBeInTheDocument();
    expect(document.getElementById('h2')).not.toBeInTheDocument();
    expect(document.getElementById('h2')).not.toBeInTheDocument();
    expect(document.getElementById('h3')).not.toBeInTheDocument();
    expect(document.getElementById('h4')).not.toBeInTheDocument();
    expect(document.getElementById('h5')).not.toBeInTheDocument();
    expect(document.getElementById('h6')).not.toBeInTheDocument();
  });
});

describe('Wysiwyg render actions with initial value', () => {
  let renderedContainer;
  let returnedValue = 'hello world';

  beforeEach(() => {
    const onChange = jest.fn((e) => {
      returnedValue += e.target.value;
    });

    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider messages={{}} locale="en">
          <Wysiwyg
            intlLabel={{ id: 'hello world', defaultMessage: 'hello world' }}
            name="rich-text"
            onChange={onChange}
          />
        </IntlProvider>
      </ThemeProvider>
    );
    renderedContainer = container;
  });

  it('should add markdown with initial value', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    expect(returnedValue).toEqual('hello world');
    const expected = `${returnedValue}**Bold**`;
    fireEvent.click(renderedContainer.querySelector('#Bold'));

    expect(returnedValue).toEqual(expected);
  });
});

describe('Wysiwyg expand mode', () => {
  let renderedContainer;

  beforeEach(() => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider messages={{}} locale="en">
          <Wysiwyg
            intlLabel={{ id: 'hello world', defaultMessage: 'hello world' }}
            name="rich-text"
            onChange={jest.fn()}
          />
        </IntlProvider>
      </ThemeProvider>
    );
    renderedContainer = container;
  });

  it('should open wysiwyg expand portal when clicking on expand button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    expect(document.getElementById('wysiwyg-expand')).not.toBeInTheDocument();

    fireEvent.click(renderedContainer.querySelector('#expand'));
    expect(document.getElementById('wysiwyg-expand')).toBeInTheDocument();
  });

  it('should close wysiwyg expand portal when clicking on collapse button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#expand'));
    fireEvent.click(document.getElementById('collapse'));

    expect(document.getElementById('wysiwyg-expand')).not.toBeInTheDocument();
  });
});

// FIXME
describe('Wysiwyg error state', () => {
  it('should show error message', async () => {
    const { container, getByText } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider messages={{}} locale="en">
          <Wysiwyg
            intlLabel={{ id: 'richtext', defaultMessage: 'richtext' }}
            name="rich-text"
            onChange={jest.fn()}
            error="This is a required field"
          />
        </IntlProvider>
      </ThemeProvider>
    );

    await waitFor(() => container.querySelector('.CodeMirror-cursor'));
    expect(getByText('This is a required field')).toBeInTheDocument();
  });
});
