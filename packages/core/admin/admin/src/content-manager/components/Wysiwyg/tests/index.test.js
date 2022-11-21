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
      .c25 {
        border: 0;
        -webkit-clip: rect(0 0 0 0);
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
      }

      .c6 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        color: #32324d;
      }

      .c15 {
        font-size: 0.875rem;
        line-height: 1.43;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #666687;
      }

      .c28 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 600;
        line-height: 1.14;
        color: #32324d;
      }

      .c34 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
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

      .c31 {
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

      .c32 {
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

      .c27 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        background-color: #4945ff;
        border: 1px solid #4945ff;
        height: 2rem;
        padding-left: 16px;
        padding-right: 16px;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c27 .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c27 .c5 {
        color: #ffffff;
      }

      .c27[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c27[aria-disabled='true'] .c5 {
        color: #666687;
      }

      .c27[aria-disabled='true'] svg > g,
      .c27[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c27[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c27[aria-disabled='true']:active .c5 {
        color: #666687;
      }

      .c27[aria-disabled='true']:active svg > g,
      .c27[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c27:hover {
        background-color: #f6f6f9;
      }

      .c27:active {
        background-color: #eaeaef;
      }

      .c27 .c5 {
        color: #32324d;
      }

      .c27 svg > g,
      .c27 svg path {
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

      .c30 {
        cursor: auto;
        height: 100%;
      }

      .c30 .CodeMirror-placeholder {
        color: #666687 !important;
      }

      .c30 .CodeMirror {
        font-size: 0.875rem;
        height: 290px;
        color: #32324d;
        direction: ltr;
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell, 'Open Sans','Helvetica Neue',sans-serif;
      }

      .c30 .CodeMirror-lines {
        padding: 12px 16px;
      }

      .c30 .CodeMirror-scrollbar-filler,
      .c30 .CodeMirror-gutter-filler {
        background-color: #ffffff;
      }

      .c30 .CodeMirror-gutters {
        border-right: 1px solid #ddd;
        background-color: #f7f7f7;
        white-space: nowrap;
      }

      .c30 .CodeMirror-linenumber {
        padding: 0 3px 0 5px;
        min-width: 20px;
        text-align: right;
        color: #999;
        white-space: nowrap;
      }

      .c30 .CodeMirror-guttermarker {
        color: black;
      }

      .c30 .CodeMirror-guttermarker-subtle {
        color: #999;
      }

      .c30 .CodeMirror-cursor {
        border-left: 1px solid black;
        border-right: none;
        width: 0;
      }

      .c30 .CodeMirror div.CodeMirror-secondarycursor {
        border-left: 1px solid silver;
      }

      .c30 .cm-fat-cursor .CodeMirror-cursor {
        width: auto;
        border: 0 !important;
        background: #7e7;
      }

      .c30 .cm-fat-cursor-mark {
        background-color: rgba(20,255,20,0.5);
        -webkit-animation: blink 1.06s steps(1) infinite;
        -moz-animation: blink 1.06s steps(1) infinite;
        -webkit-animation: blink 1.06s steps(1) infinite;
        animation: blink 1.06s steps(1) infinite;
      }

      .c30 .cm-animate-fat-cursor {
        width: auto;
        border: 0;
        -webkit-animation: blink 1.06s steps(1) infinite;
        -moz-animation: blink 1.06s steps(1) infinite;
        -webkit-animation: blink 1.06s steps(1) infinite;
        animation: blink 1.06s steps(1) infinite;
        background-color: #7e7;
      }

      .c30 .cm-tab {
        display: inline-block;
        -webkit-text-decoration: inherit;
        text-decoration: inherit;
      }

      .c30 .CodeMirror-rulers {
        position: absolute;
        left: 0;
        right: 0;
        top: -50px;
        bottom: 0;
        overflow: hidden;
      }

      .c30 .CodeMirror-ruler {
        border-left: 1px solid #ccc;
        top: 0;
        bottom: 0;
        position: absolute;
      }

      .c30 .cm-header,
      .c30 .cm-strong {
        font-weight: bold;
      }

      .c30 .cm-em {
        font-style: italic;
      }

      .c30 .cm-link {
        -webkit-text-decoration: underline;
        text-decoration: underline;
      }

      .c30 .cm-strikethrough {
        -webkit-text-decoration: line-through;
        text-decoration: line-through;
      }

      .c30 .CodeMirror-composing {
        border-bottom: 2px solid;
      }

      .c30 div.CodeMirror span.CodeMirror-matchingbracket {
        color: #0b0;
      }

      .c30 div.CodeMirror span.CodeMirror-nonmatchingbracket {
        color: #a22;
      }

      .c30 .CodeMirror-matchingtag {
        background: rgba(255,150,0,0.3);
      }

      .c30 .CodeMirror-activeline-background {
        background: #e8f2ff;
      }

      .c30 .CodeMirror {
        position: relative;
        overflow: hidden;
        background: #ffffff;
      }

      .c30 .CodeMirror-scroll {
        overflow: scroll !important;
        margin-bottom: -50px;
        margin-right: -50px;
        padding-bottom: 50px;
        height: 100%;
        outline: none;
        position: relative;
      }

      .c30 .CodeMirror-sizer {
        position: relative;
        border-right: 50px solid transparent;
      }

      .c30 .CodeMirror-vscrollbar,
      .c30 .CodeMirror-hscrollbar,
      .c30 .CodeMirror-scrollbar-filler,
      .c30 .CodeMirror-gutter-filler {
        position: absolute;
        z-index: 1;
        display: none;
        outline: none;
      }

      .c30 .CodeMirror-vscrollbar {
        right: 0;
        top: 0;
        overflow-x: hidden;
        overflow-y: scroll;
      }

      .c30 .CodeMirror-hscrollbar {
        bottom: 0;
        left: 0;
        overflow-y: hidden;
        overflow-x: scroll;
      }

      .c30 .CodeMirror-scrollbar-filler {
        right: 0;
        bottom: 0;
      }

      .c30 .CodeMirror-lines {
        cursor: text;
        min-height: 1px;
      }

      .c30 .CodeMirror pre.CodeMirror-line,
      .c30 .CodeMirror pre.CodeMirror-line-like {
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

      .c30 .CodeMirror pre.CodeMirror-line-like {
        z-index: 2;
      }

      .c30 .CodeMirror-wrap pre.CodeMirror-line,
      .c30 .CodeMirror-wrap pre.CodeMirror-line-like {
        word-wrap: break-word;
        white-space: pre-wrap;
        word-break: normal;
      }

      .c30 .CodeMirror-linebackground {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 0;
      }

      .c30 .CodeMirror-linewidget {
        position: relative;
        padding: 0.1px;
      }

      .c30 .CodeMirror-rtl pre {
        direction: rtl;
      }

      .c30 .CodeMirror-code {
        outline: none;
      }

      .c30 .CodeMirror-scroll,
      .c30 .CodeMirror-sizer,
      .c30 .CodeMirror-gutter,
      .c30 .CodeMirror-gutters,
      .c30 .CodeMirror-linenumber {
        -moz-box-sizing: content-box;
        box-sizing: content-box;
      }

      .c30 .CodeMirror-measure {
        position: absolute;
        width: 100%;
        height: 0;
        overflow: hidden;
        visibility: hidden;
      }

      .c30 .CodeMirror-cursor {
        position: absolute;
        pointer-events: none;
        border-color: #32324d;
      }

      .c30 .CodeMirror-measure pre {
        position: static;
      }

      .c30 div.CodeMirror-cursors {
        visibility: hidden;
        position: relative;
      }

      .c30 div.CodeMirror-cursors + div {
        z-index: 0 !important;
      }

      .c30 div.CodeMirror-dragcursors {
        visibility: visible;
      }

      .c30 .CodeMirror-focused div.CodeMirror-cursors {
        visibility: visible;
      }

      .c30 .CodeMirror-selected {
        background: #dcdce4;
      }

      .c30 .CodeMirror-crosshair {
        cursor: crosshair;
      }

      .c30 .cm-force-border {
        padding-right: 0.1px;
      }

      .c30 .cm-tab-wrap-hack:after {
        content: '';
      }

      .c30 span.CodeMirror-selectedtext {
        background: none;
      }

      .c30 span {
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

      .c26 {
        margin: 0 8px;
        padding: 8px;
      }

      .c26 svg {
        width: 1.125rem;
        height: 1.125rem;
      }

      .c29 {
        position: relative;
        height: calc(100% - 48px);
      }

      .c33 {
        background-color: transparent;
        border: none;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c33 svg {
        margin-left: 8px;
      }

      .c33 svg path {
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
                      <span
                        class="c25"
                      >
                        Bold
                      </span>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        focusable="false"
                        height="1em"
                        viewBox="0 0 24"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          clip-rule="evenodd"
                          d="M7.4 1.2H4.2v21.6h3.2V1.2zm11.6 6a6 6 0 01-1.5 4 6.4 6.4 0 01-3.8 11.6H7.4v-3.2h6.3c1.8 0 3.3-1.4 3.3-3.2 0-1.8-1.5-3.2-3.3-3.2H7.4V10H13a2.8 2.8 0 000-5.6H7.4V1.2H13a6 6 0 016 6z"
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
                      <span
                        class="c25"
                      >
                        Italic
                      </span>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        focusable="false"
                        height="1em"
                        viewBox="0 0 24 24"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M19.7 1H9.4v3h3.1l-4 16H4.2v3h10.3v-3h-3.3l4.2-16h4.2V1z"
                          fill="#32324D"
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
                      <span
                        class="c25"
                      >
                        Underline
                      </span>
                      <svg
                        aria-hidden="true"
                        fill="none"
                        focusable="false"
                        height="1em"
                        viewBox="0 0 24 24"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 17.3c1.99 0 3.9-.74 5.3-2.07a6.9 6.9 0 002.2-5.01V1h-3v9.22c0 1.13-.47 2.2-1.32 3A4.63 4.63 0 0112 14.48c-1.2 0-2.34-.45-3.18-1.24a4.14 4.14 0 01-1.32-3.01V1h-3v9.22a6.9 6.9 0 002.2 5.01 7.73 7.73 0 005.3 2.08zm9.75 2.14H2.25v2.83h19.5v-2.83z"
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
                    class="c21 c22 c23 c26"
                    id="more"
                    tabindex="0"
                    type="button"
                  >
                    <span
                      class="c25"
                    >
                      More
                    </span>
                    <svg
                      aria-hidden="true"
                      fill="none"
                      focusable="false"
                      height="1em"
                      viewBox="0 0 24 24"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3.5 14.6a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2zm8.5 0a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2zm8.5 0a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2z"
                        fill="#32324D"
                      />
                    </svg>
                  </button>
                </span>
              </div>
              <button
                aria-disabled="false"
                class="c21 c27"
                id="preview"
                type="button"
              >
                <span
                  class="c5 c28"
                >
                  Preview mode
                </span>
              </button>
            </div>
          </div>
          <div
            class="c29"
          >
            <div
              class="c30"
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
            class="c0 c31"
          >
            <div
              class="c0 c32"
            >
              <button
                aria-disabled="false"
                class="c21 c33"
                id="expand"
                type="button"
              >
                <span
                  class="c5 c34"
                >
                  Expand
                </span>
                <svg
                  fill="none"
                  height="1em"
                  viewBox="0 0 24 24"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.5 3.5h5v5H23V1h-7.5v2.5zm5 17h-5V23H23v-7.5h-2.5v5zm-17-17h5V1H1v7.5h2.5v-5zM1 23.3h7.5v-2.5h-5v-5H1v7.5z"
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
