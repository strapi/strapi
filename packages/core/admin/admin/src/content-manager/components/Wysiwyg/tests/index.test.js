import * as React from 'react';
import { IntlProvider } from 'react-intl';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
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
    const onChange = jest.fn(e => {
      returnedValue = e.target.value;
    });

    const { container, getByText, queryByText } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider messages={{}} locale="en">
          <Wysiwyg
            name="rich-text"
            intlLabel={{ id: 'hello world', defaultMessage: 'hello world' }}
            onChange={onChange}
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
      .c3 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c37 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c4 {
        border-radius: 4px;
        border-style: solid;
        border-width: 1px;
        border-color: #dcdce4;
      }

      .c5 {
        background: #f6f6f9;
        padding: 8px;
      }

      .c33 {
        background: #f6f6f9;
        padding: 8px;
        border-radius: 4px;
      }

      .c1 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c0 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c0 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c0 > * + * {
        margin-top: 4px;
      }

      .c2 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c2 > * + * {
        margin-left: 4px;
      }

      .c30 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c27 {
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

      .c27 svg {
        height: 12px;
        width: 12px;
      }

      .c27 svg > g,
      .c27 svg path {
        fill: #ffffff;
      }

      .c27[aria-disabled='true'] {
        pointer-events: none;
      }

      .c27:after {
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

      .c27:focus-visible {
        outline: none;
      }

      .c27:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c28 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #dcdce4;
        background: #ffffff;
      }

      .c28 .sc-bjeSbO {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c28 .c29 {
        color: #ffffff;
      }

      .c28[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c28[aria-disabled='true'] .c29 {
        color: #666687;
      }

      .c28[aria-disabled='true'] svg > g,
      .c28[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c28[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c28[aria-disabled='true']:active .c29 {
        color: #666687;
      }

      .c28[aria-disabled='true']:active svg > g,
      .c28[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c28:hover {
        background-color: #f6f6f9;
      }

      .c28:active {
        background-color: #eaeaef;
      }

      .c28 .c29 {
        color: #32324d;
      }

      .c28 svg > g,
      .c28 svg path {
        fill: #32324d;
      }

      .c6 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c7 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c34 {
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
        -webkit-align-items: flex-end;
        -webkit-box-align: flex-end;
        -ms-flex-align: flex-end;
        align-items: flex-end;
      }

      .c22 {
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

      .c22 svg {
        height: 12px;
        width: 12px;
      }

      .c22 svg > g,
      .c22 svg path {
        fill: #ffffff;
      }

      .c22[aria-disabled='true'] {
        pointer-events: none;
      }

      .c22:after {
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

      .c22:focus-visible {
        outline: none;
      }

      .c22:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c19 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c24 {
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

      .c24 svg > g,
      .c24 svg path {
        fill: #8e8ea9;
      }

      .c24:hover svg > g,
      .c24:hover svg path {
        fill: #666687;
      }

      .c24:active svg > g,
      .c24:active svg path {
        fill: #a5a5ba;
      }

      .c24[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c24[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c20 span:first-child button {
        border-left: 1px solid #dcdce4;
        border-radius: 4px 0 0 4px;
      }

      .c20 span:last-child button {
        border-radius: 0 4px 4px 0;
      }

      .c20 .c23 {
        border-radius: 0;
        border-left: none;
      }

      .c20 .c23 svg path {
        fill: #4a4a6a;
      }

      .c20 .c23:hover {
        background-color: #f6f6f9;
      }

      .c20 .c23:hover svg path {
        fill: #32324d;
      }

      .c20 .c23:active {
        background-color: #eaeaef;
      }

      .c20 .c23:active svg path {
        fill: #212134;
      }

      .c20 .c23[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c11 {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        width: 100%;
        background: transparent;
        border: none;
      }

      .c11:focus {
        outline: none;
      }

      .c11[aria-disabled='true'] {
        cursor: not-allowed;
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

      .c14 {
        padding-right: 16px;
        padding-left: 16px;
      }

      .c16 {
        padding-left: 12px;
      }

      .c9 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c12 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c8 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c8 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c8 > * + * {
        margin-top: 0px;
      }

      .c10 {
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

      .c10:focus-within {
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

      .c32 {
        cursor: not-allowed !important;
      }

      .c32 .CodeMirror-placeholder {
        color: #666687 !important;
      }

      .c32 .CodeMirror {
        font-size: 0.875rem;
        height: 290px;
        color: #32324d;
        direction: ltr;
        font-family: --apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell, 'Open Sans','Helvetica Neue',sans-serif;
      }

      .c32 .CodeMirror-lines {
        padding: 12px 16px;
      }

      .c32 .CodeMirror-scrollbar-filler,
      .c32 .CodeMirror-gutter-filler {
        background-color: white;
      }

      .c32 .CodeMirror-gutters {
        border-right: 1px solid #ddd;
        background-color: #f7f7f7;
        white-space: nowrap;
      }

      .c32 .CodeMirror-linenumber {
        padding: 0 3px 0 5px;
        min-width: 20px;
        text-align: right;
        color: #999;
        white-space: nowrap;
      }

      .c32 .CodeMirror-guttermarker {
        color: black;
      }

      .c32 .CodeMirror-guttermarker-subtle {
        color: #999;
      }

      .c32 .CodeMirror-cursor {
        border-left: 1px solid black;
        border-right: none;
        width: 0;
      }

      .c32 .CodeMirror div.CodeMirror-secondarycursor {
        border-left: 1px solid silver;
      }

      .c32 .cm-fat-cursor .CodeMirror-cursor {
        width: auto;
        border: 0 !important;
        background: #7e7;
      }

      .c32 .cm-fat-cursor-mark {
        background-color: rgba(20,255,20,0.5);
        -webkit-animation: blink 1.06s steps(1) infinite;
        -moz-animation: blink 1.06s steps(1) infinite;
        -webkit-animation: blink 1.06s steps(1) infinite;
        animation: blink 1.06s steps(1) infinite;
      }

      .c32 .cm-animate-fat-cursor {
        width: auto;
        border: 0;
        -webkit-animation: blink 1.06s steps(1) infinite;
        -moz-animation: blink 1.06s steps(1) infinite;
        -webkit-animation: blink 1.06s steps(1) infinite;
        animation: blink 1.06s steps(1) infinite;
        background-color: #7e7;
      }

      .c32 .cm-tab {
        display: inline-block;
        -webkit-text-decoration: inherit;
        text-decoration: inherit;
      }

      .c32 .CodeMirror-rulers {
        position: absolute;
        left: 0;
        right: 0;
        top: -50px;
        bottom: 0;
        overflow: hidden;
      }

      .c32 .CodeMirror-ruler {
        border-left: 1px solid #ccc;
        top: 0;
        bottom: 0;
        position: absolute;
      }

      .c32 .cm-header,
      .c32 .cm-strong {
        font-weight: bold;
      }

      .c32 .cm-em {
        font-style: italic;
      }

      .c32 .cm-link {
        -webkit-text-decoration: underline;
        text-decoration: underline;
      }

      .c32 .cm-strikethrough {
        -webkit-text-decoration: line-through;
        text-decoration: line-through;
      }

      .c32 .CodeMirror-composing {
        border-bottom: 2px solid;
      }

      .c32 div.CodeMirror span.CodeMirror-matchingbracket {
        color: #0b0;
      }

      .c32 div.CodeMirror span.CodeMirror-nonmatchingbracket {
        color: #a22;
      }

      .c32 .CodeMirror-matchingtag {
        background: rgba(255,150,0,0.3);
      }

      .c32 .CodeMirror-activeline-background {
        background: #e8f2ff;
      }

      .c32 .CodeMirror {
        position: relative;
        overflow: hidden;
        background: white;
      }

      .c32 .CodeMirror-scroll {
        overflow: scroll !important;
        margin-bottom: -50px;
        margin-right: -50px;
        padding-bottom: 50px;
        height: 100%;
        outline: none;
        position: relative;
      }

      .c32 .CodeMirror-sizer {
        position: relative;
        border-right: 50px solid transparent;
      }

      .c32 .CodeMirror-vscrollbar,
      .c32 .CodeMirror-hscrollbar,
      .c32 .CodeMirror-scrollbar-filler,
      .c32 .CodeMirror-gutter-filler {
        position: absolute;
        z-index: 1;
        display: none;
        outline: none;
      }

      .c32 .CodeMirror-vscrollbar {
        right: 0;
        top: 0;
        overflow-x: hidden;
        overflow-y: scroll;
      }

      .c32 .CodeMirror-hscrollbar {
        bottom: 0;
        left: 0;
        overflow-y: hidden;
        overflow-x: scroll;
      }

      .c32 .CodeMirror-scrollbar-filler {
        right: 0;
        bottom: 0;
      }

      .c32 .CodeMirror-lines {
        cursor: text;
        min-height: 1px;
      }

      .c32 .CodeMirror pre.CodeMirror-line,
      .c32 .CodeMirror pre.CodeMirror-line-like {
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
        line-height: inherit;
        color: inherit;
        position: relative;
        overflow: visible;
        -webkit-tap-highlight-color: transparent;
        -webkit-font-variant-ligatures: contextual;
        font-variant-ligatures: contextual;
      }

      .c32 .CodeMirror pre.CodeMirror-line-like {
        z-index: 2;
      }

      .c32 .CodeMirror-wrap pre.CodeMirror-line,
      .c32 .CodeMirror-wrap pre.CodeMirror-line-like {
        word-wrap: break-word;
        white-space: pre-wrap;
        word-break: normal;
      }

      .c32 .CodeMirror-linebackground {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 0;
      }

      .c32 .CodeMirror-linewidget {
        position: relative;
        padding: 0.1px;
      }

      .c32 .CodeMirror-rtl pre {
        direction: rtl;
      }

      .c32 .CodeMirror-code {
        outline: none;
      }

      .c32 .CodeMirror-scroll,
      .c32 .CodeMirror-sizer,
      .c32 .CodeMirror-gutter,
      .c32 .CodeMirror-gutters,
      .c32 .CodeMirror-linenumber {
        -moz-box-sizing: content-box;
        box-sizing: content-box;
      }

      .c32 .CodeMirror-measure {
        position: absolute;
        width: 100%;
        height: 0;
        overflow: hidden;
        visibility: hidden;
      }

      .c32 .CodeMirror-cursor {
        position: absolute;
        pointer-events: none;
      }

      .c32 .CodeMirror-measure pre {
        position: static;
      }

      .c32 div.CodeMirror-cursors {
        visibility: hidden;
        position: relative;
      }

      .c32 div.CodeMirror-cursors + div {
        z-index: 0 !important;
      }

      .c32 div.CodeMirror-dragcursors {
        visibility: visible;
      }

      .c32 .CodeMirror-focused div.CodeMirror-cursors {
        visibility: visible;
      }

      .c32 .CodeMirror-selected {
        background: #dcdce4;
      }

      .c32 .CodeMirror-crosshair {
        cursor: crosshair;
      }

      .c32 .cm-force-border {
        padding-right: 0.1px;
      }

      .c32 .cm-tab-wrap-hack:after {
        content: '';
      }

      .c32 span.CodeMirror-selectedtext {
        background: none;
      }

      .c32 span {
        color: #32324d !important;
      }

      .c35 {
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

      .c35 svg {
        height: 12px;
        width: 12px;
      }

      .c35 svg > g,
      .c35 svg path {
        fill: #ffffff;
      }

      .c35[aria-disabled='true'] {
        pointer-events: none;
      }

      .c35:after {
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

      .c35:focus-visible {
        outline: none;
      }

      .c35:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c25 {
        padding: 8px;
        outline-offset: -2px !important;
      }

      .c25 svg {
        width: 1.125rem;
        height: 1.125rem;
      }

      .c21 {
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

      .c31 {
        position: relative;
      }

      .c36 {
        background-color: transparent;
        border: none;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c36 svg {
        margin-left: 8px;
      }

      .c36 svg path {
        fill: #4a4a6a;
        width: 0.75rem;
        height: 0.75rem;
      }

      <div
        class="c0"
      >
        <div
          class="c1 c2"
        >
          <span
            class="c3"
          >
            hello world
          </span>
        </div>
        <div
          class="c4"
        >
          <div
            class="c5"
          >
            <div
              class="c6"
            >
              <div
                class="c7"
              >
                <div>
                  <div
                    class="c8"
                  >
                    <div
                      class="c9 c10"
                    >
                      <button
                        aria-disabled="false"
                        aria-expanded="false"
                        aria-haspopup="listbox"
                        aria-labelledby="selectTitle-label selectTitle-content"
                        class="c11"
                        id="selectTitle"
                        type="button"
                      />
                      <div
                        class="c12 c13"
                      >
                        <div
                          class="c9"
                        >
                          <div
                            class="c14"
                          >
                            <span
                              class="c15"
                              id="selectTitle-content"
                            >
                              Add a title
                            </span>
                          </div>
                        </div>
                        <div
                          class="c9"
                        >
                          <button
                            aria-hidden="true"
                            class="c16 c17 c18"
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
                  class="c19 c20 c21"
                >
                  <span>
                    <button
                      aria-disabled="false"
                      aria-labelledby="tooltip-1"
                      class="c22 c23 c24 c25"
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
                      class="c22 c23 c24 c25"
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
                      class="c22 c23 c24 c25"
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
                    class="c22 c23 c24 c26"
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
                class="c27 c28"
                id="preview"
                type="button"
              >
                <span
                  class="c29 c30"
                >
                  Preview mode
                </span>
              </button>
            </div>
          </div>
          <div
            class="c31"
          >
            <div
              class="c32"
              disabled=""
            >
              <textarea
                style="display: none;"
              />
              <div
                class="CodeMirror cm-s-default CodeMirror-wrap"
                translate="no"
              >
                <div
                  style="overflow: hidden; position: relative; width: 3px; height: 0px;"
                >
                  <textarea
                    aria-label="Editor"
                    autocapitalize="off"
                    autocorrect="off"
                    disabled=""
                    readonly=""
                    spellcheck="false"
                    style="position: absolute; bottom: -1em; padding: 0px; width: 1000px; height: 1em; min-height: 1em; outline: none;"
                    tabindex="0"
                  />
                </div>
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
                            class="CodeMirror-code"
                            role="presentation"
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
            class="c33"
          >
            <div
              class="c34"
            >
              <button
                aria-disabled="false"
                class="c35 c36"
                id="expand"
                type="button"
              >
                <span
                  class="c37"
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
      const hasText = node => node.textContent === '<u>Underline</u>';
      const nodeHasText = hasText(node);
      const childrenDontHaveText = Array.from(node.children).every(child => !hasText(child));

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
      const hasText = node => node.textContent === '<u>Underline</u>';
      const nodeHasText = hasText(node);
      const childrenDontHaveText = Array.from(node.children).every(child => !hasText(child));

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
    const onChange = jest.fn(e => {
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
