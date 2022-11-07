import React from 'react';
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import HomePage from '../index';
import { useModels } from '../../../hooks';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
  useGuidedTour: jest.fn(() => ({
    isGuidedTourVisible: false,
    guidedTourState: {
      apiTokens: {
        create: false,
        success: false,
      },
      contentManager: {
        create: false,
        success: false,
      },
      contentTypeBuilder: {
        create: false,
        success: false,
      },
    },
  })),
}));

jest.mock('../../../hooks', () => ({
  useModels: jest.fn(),
}));

const history = createMemoryHistory();

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <Router history={history}>
        <HomePage />
      </Router>
    </IntlProvider>
  </ThemeProvider>
);

describe('Homepage', () => {
  useModels.mockImplementation(() => ({
    isLoading: false,
    collectionTypes: [],
    singleTypes: [],
  }));

  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c23 {
        background: #ffffff;
        padding: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c25 {
        background: #f0f0ff;
        padding: 12px;
        border-radius: 4px;
      }

      .c31 {
        background: #fdf4dc;
        padding: 12px;
        border-radius: 4px;
      }

      .c32 {
        background: #eaf5ff;
        padding: 12px;
        border-radius: 4px;
      }

      .c33 {
        background: #f6ecfc;
        padding: 12px;
        border-radius: 4px;
      }

      .c24 {
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

      .c10 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c10 > * + * {
        margin-top: 20px;
      }

      .c27 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c27 > * + * {
        margin-top: 4px;
      }

      .c37 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c37 > * + * {
        margin-top: 12px;
      }

      .c12 {
        color: #32324d;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
      }

      .c13 {
        color: #666687;
        font-size: 1rem;
        line-height: 1.5;
      }

      .c28 {
        font-weight: 500;
        color: #32324d;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c30 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c38 {
        color: #32324d;
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.25;
      }

      .c18 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c20 {
        padding-left: 8px;
      }

      .c15 {
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

      .c15 svg {
        height: 12px;
        width: 12px;
      }

      .c15 svg > g,
      .c15 svg path {
        fill: #ffffff;
      }

      .c15[aria-disabled='true'] {
        pointer-events: none;
      }

      .c15:after {
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

      .c15:focus-visible {
        outline: none;
      }

      .c15:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c16 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 10px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
      }

      .c16 .c19 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c16 .c17 {
        color: #ffffff;
      }

      .c16[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c16[aria-disabled='true'] .c17 {
        color: #666687;
      }

      .c16[aria-disabled='true'] svg > g,
      .c16[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c16[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c16[aria-disabled='true']:active .c17 {
        color: #666687;
      }

      .c16[aria-disabled='true']:active svg > g,
      .c16[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c16:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c16:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c16 svg > g,
      .c16 svg path {
        fill: #ffffff;
      }

      .c5 {
        padding: 56px;
      }

      .c8 {
        padding-bottom: 56px;
        padding-left: 24px;
      }

      .c35 {
        background: #ffffff;
        padding-top: 24px;
        padding-right: 20px;
        padding-bottom: 24px;
        padding-left: 20px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c36 {
        padding-bottom: 32px;
      }

      .c41 {
        color: #4945ff;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c42 {
        padding-left: 8px;
      }

      .c39 {
        cursor: pointer;
      }

      .c40 {
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-text-decoration: none;
        text-decoration: none;
        position: relative;
        outline: none;
      }

      .c40 svg path {
        fill: #4945ff;
      }

      .c40 svg {
        font-size: 0.625rem;
      }

      .c40:after {
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

      .c40:focus-visible {
        outline: none;
      }

      .c40:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c43 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
      }

      .c53 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c51 {
        padding-right: 8px;
      }

      .c47 {
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

      .c47 svg {
        height: 12px;
        width: 12px;
      }

      .c47 svg > g,
      .c47 svg path {
        fill: #ffffff;
      }

      .c47[aria-disabled='true'] {
        pointer-events: none;
      }

      .c47:after {
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

      .c47:focus-visible {
        outline: none;
      }

      .c47:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c46 {
        cursor: pointer;
      }

      .c48 {
        padding: 10px 16px;
        background: #4945ff;
        border: 1px solid #4945ff;
        border-radius: 4px;
        border: 1px solid #dcdce4;
        background: #ffffff;
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c48 .c50 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c48 .c52 {
        color: #ffffff;
      }

      .c48[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c48[aria-disabled='true'] .c52 {
        color: #666687;
      }

      .c48[aria-disabled='true'] svg > g,
      .c48[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c48[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c48[aria-disabled='true']:active .c52 {
        color: #666687;
      }

      .c48[aria-disabled='true']:active svg > g,
      .c48[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c48:hover {
        background-color: #f6f6f9;
      }

      .c48:active {
        background-color: #eaeaef;
      }

      .c48 .c52 {
        color: #32324d;
      }

      .c48 svg > g,
      .c48 svg path {
        fill: #32324d;
      }

      .c26 {
        margin-right: 24px;
      }

      .c26 svg {
        width: 2rem;
        height: 2rem;
      }

      .c29 {
        word-break: break-all;
      }

      .c1 {
        padding-bottom: 56px;
      }

      .c0 {
        display: grid;
        grid-template-columns: 1fr;
      }

      .c2 {
        overflow-x: hidden;
      }

      .c3:focus-visible {
        outline: none;
      }

      .c6 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 0px;
      }

      .c21 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 24px;
      }

      .c7 {
        grid-column: span 8;
        max-width: 100%;
      }

      .c34 {
        grid-column: span 4;
        max-width: 100%;
      }

      .c45 {
        grid-column: span 6;
        max-width: 100%;
      }

      .c54 path {
        fill: #7289da !important;
      }

      .c55 > path:first-child {
        fill: #ff4500;
      }

      .c58 > path:first-child {
        fill: #8e75ff;
      }

      .c58 > path:nth-child(2) {
        fill: #8e75ff;
      }

      .c58 > path:nth-child(3) {
        fill: #8e75ff;
      }

      .c56 path {
        fill: #1da1f2 !important;
      }

      .c57 > path:first-child {
        fill: #231f20;
      }

      .c57 > path:nth-child(2) {
        fill: #fff9ae;
      }

      .c57 > path:nth-child(3) {
        fill: #00aeef;
      }

      .c57 > path:nth-child(4) {
        fill: #00a94f;
      }

      .c57 > path:nth-child(5) {
        fill: #f15d22;
      }

      .c57 > path:nth-child(6) {
        fill: #e31b23;
      }

      .c49 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        border: none;
      }

      .c49 svg {
        width: 24px;
        height: 24px;
      }

      .c49 span {
        word-break: keep-all;
      }

      .c44 {
        row-gap: 8px;
        -webkit-column-gap: 16px;
        column-gap: 16px;
      }

      .c14 {
        word-break: break-word;
      }

      .c11 {
        -webkit-align-items: flex-start;
        -webkit-box-align: flex-start;
        -ms-flex-align: flex-start;
        align-items: flex-start;
      }

      .c22 {
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c4 {
        position: absolute;
        top: 0;
        right: 0;
      }

      .c4 img {
        width: 9.375rem;
      }

      @media (max-width:68.75rem) {
        .c7 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c7 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c34 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c34 {
          grid-column: span;
        }
      }

      @media (max-width:68.75rem) {
        .c45 {
          grid-column: span 12;
        }
      }

      @media (max-width:34.375rem) {
        .c45 {
          grid-column: span;
        }
      }

      <div
        class="c0"
      >
        <div
          class="c1 c2"
        >
          <main
            aria-labelledby="main-content-title"
            class="c3"
            id="main-content"
            tabindex="-1"
          >
            <div
              class="c4"
            >
              <img
                alt=""
                aria-hidden="true"
                src="IMAGE_MOCK"
              />
            </div>
            <div
              class="c5"
            >
              <div
                class="c6"
              >
                <div
                  class="c7"
                >
                  <div
                    class=""
                  >
                    <div>
                      <div
                        class="c8"
                      >
                        <div
                          class="c9 c10 c11"
                          spacing="5"
                        >
                          <h1
                            class="c12"
                          >
                            Welcome on board!
                          </h1>
                          <span
                            class="c13 c14"
                          >
                            Congrats! You are logged as the first administrator. To discover the powerful features provided by Strapi, we recommend you to create your first Content type!
                          </span>
                          <button
                            aria-disabled="false"
                            class="c15 c16"
                            type="button"
                          >
                            <span
                              class="c17 c18"
                            >
                              Create your first Content type
                            </span>
                            <div
                              aria-hidden="true"
                              class="c19 c20"
                            >
                              <svg
                                fill="none"
                                height="1em"
                                viewBox="0 0 24 24"
                                width="1em"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M0 10.7c0-.11.09-.2.2-.2h18.06l-8.239-8.239a.2.2 0 010-.282L11.86.14a.2.2 0 01.282 0L23.86 11.86a.2.2 0 010 .282L12.14 23.86a.2.2 0 01-.282 0L10.02 22.02a.2.2 0 010-.282L18.26 13.5H.2a.2.2 0 01-.2-.2v-2.6z"
                                  fill="#212134"
                                />
                              </svg>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="c21"
              >
                <div
                  class="c7"
                >
                  <div
                    class=""
                  >
                    <div
                      class="c9 c10"
                      spacing="5"
                    >
                      <a
                        class="c22"
                        href="https://strapi.io/resource-center"
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                      >
                        <div
                          class="c23 c24"
                        >
                          <div
                            class="c25 c24 c26"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 32 32"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0 4a4 4 0 014-4h24a4 4 0 014 4v24a4 4 0 01-4 4H4a4 4 0 01-4-4V4z"
                                fill="#4945FF"
                              />
                              <path
                                d="M15.733 8c.343 0 .678.108.963.31.285.202.507.49.639.826.13.337.165.707.098 1.064a1.879 1.879 0 01-.474.942 1.705 1.705 0 01-.887.504 1.64 1.64 0 01-1.002-.105 1.76 1.76 0 01-.778-.678A1.924 1.924 0 0114 9.841a1.9 1.9 0 01.508-1.302c.325-.345.766-.539 1.225-.539zM20 24h-8v-2.265h2.933v-6.23H12.8v-2.266h4.267v8.495H20V24z"
                                fill="#fff"
                              />
                            </svg>
                          </div>
                          <div
                            class="c9 c27"
                            spacing="1"
                          >
                            <div
                              class="c24"
                            >
                              <span
                                class="c28 c29"
                              >
                                Documentation
                              </span>
                            </div>
                            <span
                              class="c30"
                            >
                              Discover the essential concepts, guides and instructions.
                            </span>
                          </div>
                        </div>
                      </a>
                      <a
                        class="c22"
                        href="https://strapi.io/starters"
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                      >
                        <div
                          class="c23 c24"
                        >
                          <div
                            class="c31 c24 c26"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 32 32"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0 4a4 4 0 014-4h24a4 4 0 014 4v24a4 4 0 01-4 4H4a4 4 0 01-4-4V4z"
                                fill="#D9822F"
                              />
                              <path
                                clip-rule="evenodd"
                                d="M17.143 18.659v2.912l6.856-3.878v-2.815L17.143 11v2.906l4.16 2.38-4.16 2.373zm-2.287 0l-4.16-2.374 4.16-2.38V11L8 14.877v2.816l6.856 3.878v-2.912z"
                                fill="#fff"
                                fill-rule="evenodd"
                              />
                            </svg>
                          </div>
                          <div
                            class="c9 c27"
                            spacing="1"
                          >
                            <div
                              class="c24"
                            >
                              <span
                                class="c28 c29"
                              >
                                Code example
                              </span>
                            </div>
                            <span
                              class="c30"
                            >
                              Learn by using ready-made starters for your projects.
                            </span>
                          </div>
                        </div>
                      </a>
                      <a
                        class="c22"
                        href="https://strapi.io/blog/categories/tutorials"
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                      >
                        <div
                          class="c23 c24"
                        >
                          <div
                            class="c32 c24 c26"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 32 32"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0 4a4 4 0 014-4h24a4 4 0 014 4v24a4 4 0 01-4 4H4a4 4 0 01-4-4V4z"
                                fill="#66B7F1"
                              />
                              <path
                                clip-rule="evenodd"
                                d="M12 10.921a.5.5 0 01.773-.419l8.582 5.579a.5.5 0 010 .838l-8.582 5.579a.5.5 0 01-.773-.42V10.922z"
                                fill="#fff"
                                fill-rule="evenodd"
                              />
                            </svg>
                          </div>
                          <div
                            class="c9 c27"
                            spacing="1"
                          >
                            <div
                              class="c24"
                            >
                              <span
                                class="c28 c29"
                              >
                                Tutorials
                              </span>
                            </div>
                            <span
                              class="c30"
                            >
                              Follow step-by-step instructions to use and customize Strapi.
                            </span>
                          </div>
                        </div>
                      </a>
                      <a
                        class="c22"
                        href="https://strapi.io/blog"
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                      >
                        <div
                          class="c23 c24"
                        >
                          <div
                            class="c33 c24 c26"
                          >
                            <svg
                              fill="none"
                              height="1em"
                              viewBox="0 0 32 32"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0 4a4 4 0 014-4h24a4 4 0 014 4v24a4 4 0 01-4 4H4a4 4 0 01-4-4V4z"
                                fill="#9736E8"
                              />
                              <path
                                d="M18.037 11.774a28.578 28.578 0 00-2.948 2.706c-1.995 2.109-3.55 4.093-4.761 6.06-.289.469-.574.945-.855 1.418a9.074 9.074 0 00-.463 1.536c-.074.37.275.68.577.395.312-.299.587-.64.851-.985.467-.608.906-1.237 1.342-1.867 3.37.242 7.27-2.048 8.933-4.857a.196.196 0 00.017-.167.183.183 0 00-.114-.118c-.809-.27-1.798-.44-2.207-.462-.017 0-.034-.014-.037-.035a.039.039 0 01.024-.043c1.113-.58 1.924-.647 2.877-.505.07.01.134-.046.16-.114.095-.217.356-.87.537-1.404a.201.201 0 00-.087-.239c-.71-.384-1.656-.643-2.035-.682-.017 0-.03-.018-.034-.036a.039.039 0 01.024-.043c1.1-.483 1.485-.497 2.364-.302.087.018.17-.05.19-.142.433-1.714.574-3.197.608-3.68a.21.21 0 00-.057-.157.177.177 0 00-.148-.05c-2.444.356-4.403.865-6.093 1.55-.057.022-.11.072-.11.136.144.551-.242 1.209-.845 1.703a.042.042 0 01-.044.018.046.046 0 01-.027-.043c.004-.046.158-.665.067-1.116-.013-.064-.033-.125-.084-.16a.173.173 0 00-.17-.014c-7.924 3.811-5.922 10.098-5.922 10.098.01.004.02.004.03.007.895-1.86 1.904-3.232 3.49-5.035 1.178-1.337 2.331-2.425 3.525-3.325.75-.565 2.448-1.738 3.51-2.144a.285.285 0 01.105-.021c.097 0 .177.064.2.16a.264.264 0 01-.046.228l-2.344 1.731z"
                                fill="#fff"
                              />
                            </svg>
                          </div>
                          <div
                            class="c9 c27"
                            spacing="1"
                          >
                            <div
                              class="c24"
                            >
                              <span
                                class="c28 c29"
                              >
                                Blog
                              </span>
                            </div>
                            <span
                              class="c30"
                            >
                              Read the latest news about Strapi and the ecosystem.
                            </span>
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
                <div
                  class="c34"
                >
                  <div
                    class=""
                  >
                    <aside
                      aria-labelledby="join-the-community"
                      class="c35"
                    >
                      <div
                        class="c36"
                      >
                        <div
                          class="c9 c10"
                          spacing="5"
                        >
                          <div
                            class="c9 c37"
                            spacing="3"
                          >
                            <h2
                              class="c38"
                              id="join-the-community"
                            >
                              Join the community
                            </h2>
                            <span
                              class="c30"
                            >
                              Discuss with team members, contributors and developers on different channels
                            </span>
                          </div>
                          <a
                            class="c39 c40"
                            href="https://feedback.strapi.io/"
                            rel="noreferrer noopener"
                            target="_blank"
                          >
                            <span
                              class="c41"
                            >
                              See our road map
                            </span>
                            <span
                              aria-hidden="true"
                              class="c42 c43"
                            >
                              <svg
                                fill="none"
                                height="1em"
                                viewBox="0 0 24 24"
                                width="1em"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M16.235 2.824a1.412 1.412 0 010-2.824h6.353C23.368 0 24 .633 24 1.412v6.353a1.412 1.412 0 01-2.823 0V4.82l-8.179 8.178a1.412 1.412 0 01-1.996-1.996l8.178-8.178h-2.945zm4.942 10.588a1.412 1.412 0 012.823 0v9.176c0 .78-.632 1.412-1.412 1.412H1.412C.632 24 0 23.368 0 22.588V1.412C0 .632.632 0 1.412 0h9.176a1.412 1.412 0 010 2.824H2.824v18.353h18.353v-7.765z"
                                  fill="#32324D"
                                />
                              </svg>
                            </span>
                          </a>
                        </div>
                      </div>
                      <div
                        class="c6 c44"
                      >
                        <div
                          class="c45"
                        >
                          <div
                            class=""
                          >
                            <a
                              aria-disabled="false"
                              class="c46 c47 c48 c49"
                              href="https://github.com/strapi/strapi/"
                              rel="noreferrer noopener"
                              target="_blank"
                            >
                              <div
                                aria-hidden="true"
                                class="c50 c51"
                              >
                                <svg
                                  fill="#7289DA"
                                  height="1em"
                                  viewBox="0 0 24 24"
                                  width="1em"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M12 0C5.373 0 0 5.501 0 12.288c0 5.43 3.438 10.035 8.206 11.66.6.114.82-.266.82-.59 0-.294-.01-1.262-.016-2.289-3.338.744-4.043-1.45-4.043-1.45-.546-1.42-1.332-1.797-1.332-1.797-1.089-.763.082-.747.082-.747 1.205.086 1.84 1.266 1.84 1.266 1.07 1.878 2.807 1.335 3.491 1.021.108-.794.42-1.336.762-1.643-2.665-.31-5.467-1.364-5.467-6.073 0-1.341.469-2.437 1.236-3.298-.124-.31-.535-1.56.117-3.252 0 0 1.007-.33 3.3 1.26A11.25 11.25 0 0112 5.942c1.02.005 2.047.141 3.006.414 2.29-1.59 3.297-1.26 3.297-1.26.653 1.693.242 2.943.118 3.252.77.86 1.235 1.957 1.235 3.298 0 4.72-2.808 5.76-5.48 6.063.43.382.814 1.13.814 2.276 0 1.644-.014 2.967-.014 3.372 0 .327.216.71.825.59C20.566 22.32 24 17.715 24 12.288 24 5.501 18.627 0 12 0z"
                                    fill="#161614"
                                  />
                                </svg>
                              </div>
                              <span
                                class="c52 c53"
                              >
                                Github
                              </span>
                            </a>
                          </div>
                        </div>
                        <div
                          class="c45"
                        >
                          <div
                            class=""
                          >
                            <a
                              aria-disabled="false"
                              class="c46 c47 c48 c49"
                              href="https://discord.strapi.io/"
                              rel="noreferrer noopener"
                              target="_blank"
                            >
                              <div
                                aria-hidden="true"
                                class="c50 c51"
                              >
                                <svg
                                  class="c54"
                                  fill="none"
                                  height="1em"
                                  viewBox="0 0 24 24"
                                  width="1em"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M20.04 0H3.96A2.464 2.464 0 001.5 2.468v16.2a2.464 2.464 0 002.46 2.469h13.608l-.636-2.217 1.536 1.426 1.452 1.342 2.58 2.277V2.468A2.464 2.464 0 0020.04 0zm-4.632 15.65s-.432-.516-.792-.972c1.572-.443 2.172-1.425 2.172-1.425-.492.323-.96.55-1.38.707-.6.251-1.176.419-1.74.515a8.417 8.417 0 01-3.108-.012 10.086 10.086 0 01-1.764-.515 7.053 7.053 0 01-.876-.408c-.036-.024-.072-.036-.108-.06a.166.166 0 01-.048-.036 4.202 4.202 0 01-.336-.203s.576.958 2.1 1.414c-.36.455-.804.994-.804.994-2.652-.084-3.66-1.821-3.66-1.821 0-3.859 1.728-6.986 1.728-6.986 1.728-1.294 3.372-1.258 3.372-1.258l.12.144c-2.16.623-3.156 1.57-3.156 1.57s.264-.144.708-.348c1.284-.563 2.304-.72 2.724-.755.072-.012.132-.024.204-.024A9.792 9.792 0 0116.8 7.297s-.948-.898-2.988-1.521l.168-.192s1.644-.036 3.372 1.258c0 0 1.728 3.127 1.728 6.986 0 0-1.02 1.737-3.672 1.821zm-5.58-5.597c-.684 0-1.224.6-1.224 1.33 0 .731.552 1.33 1.224 1.33.684 0 1.224-.599 1.224-1.33.012-.73-.54-1.33-1.224-1.33zm4.38 0c-.684 0-1.224.6-1.224 1.33 0 .731.552 1.33 1.224 1.33.684 0 1.224-.599 1.224-1.33 0-.73-.54-1.33-1.224-1.33z"
                                    fill="#7289DA"
                                  />
                                </svg>
                              </div>
                              <span
                                class="c52 c53"
                              >
                                Discord
                              </span>
                            </a>
                          </div>
                        </div>
                        <div
                          class="c45"
                        >
                          <div
                            class=""
                          >
                            <a
                              aria-disabled="false"
                              class="c46 c47 c48 c49"
                              href="https://www.reddit.com/r/Strapi/"
                              rel="noreferrer noopener"
                              target="_blank"
                            >
                              <div
                                aria-hidden="true"
                                class="c50 c51"
                              >
                                <svg
                                  class="c55"
                                  fill="none"
                                  height="1em"
                                  viewBox="0 0 24 24"
                                  width="1em"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    clip-rule="evenodd"
                                    d="M23.634 12.018c0 6.583-5.263 11.92-11.754 11.92C5.388 23.938.125 18.6.125 12.018S5.388.098 11.88.098c6.491 0 11.754 5.337 11.754 11.92zM17.94 10.34a1.73 1.73 0 011.779 1.677c.012.67-.36 1.286-.95 1.585.012.175.012.35 0 .524 0 2.673-3.067 4.842-6.851 4.842s-6.852-2.172-6.852-4.842a3.925 3.925 0 010-.524 1.662 1.662 0 01-.461-.314 1.756 1.756 0 01-.076-2.46 1.697 1.697 0 012.425-.076 8.339 8.339 0 014.584-1.467l.868-4.136v-.006a.364.364 0 01.435-.282l2.881.584c.184-.326.517-.545.888-.584a1.18 1.18 0 011.295 1.058 1.188 1.188 0 01-1.044 1.313 1.18 1.18 0 01-1.294-1.058l-2.515-.536-.763 3.718a8.277 8.277 0 014.526 1.467 1.71 1.71 0 011.125-.483zm-8.798 1.677c-.648 0-1.177.536-1.177 1.194a1.19 1.19 0 001.177 1.194c.649 0 1.178-.536 1.178-1.194 0-.658-.53-1.194-1.178-1.194zm2.747 5.39a4.47 4.47 0 002.904-.919v.047a.339.339 0 00.006-.47.327.327 0 00-.465-.007 3.83 3.83 0 01-2.457.726 3.802 3.802 0 01-2.446-.75.314.314 0 00-.403 0 .327.327 0 00-.044.454 4.47 4.47 0 002.905.918zm1.516-4.155c0 .658.529 1.194 1.178 1.194l-.01.045h.06a1.186 1.186 0 001.127-1.239c0-.657-.529-1.194-1.178-1.194-.648 0-1.177.537-1.177 1.194z"
                                    fill="#FF4500"
                                    fill-rule="evenodd"
                                  />
                                </svg>
                              </div>
                              <span
                                class="c52 c53"
                              >
                                Reddit
                              </span>
                            </a>
                          </div>
                        </div>
                        <div
                          class="c45"
                        >
                          <div
                            class=""
                          >
                            <a
                              aria-disabled="false"
                              class="c46 c47 c48 c49"
                              href="https://twitter.com/strapijs"
                              rel="noreferrer noopener"
                              target="_blank"
                            >
                              <div
                                aria-hidden="true"
                                class="c50 c51"
                              >
                                <svg
                                  class="c56"
                                  fill="none"
                                  height="1em"
                                  viewBox="0 0 24 24"
                                  width="1em"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M24 4.557a9.83 9.83 0 01-2.828.775 4.932 4.932 0 002.165-2.724 9.864 9.864 0 01-3.127 1.195 4.916 4.916 0 00-3.594-1.555c-3.179 0-5.515 2.966-4.797 6.045A13.978 13.978 0 011.671 3.149a4.93 4.93 0 001.523 6.574 4.903 4.903 0 01-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.935 4.935 0 01-2.224.084 4.928 4.928 0 004.6 3.419A9.9 9.9 0 010 19.54a13.94 13.94 0 007.548 2.212c9.142 0 14.307-7.721 13.995-14.646A10.025 10.025 0 0024 4.557z"
                                    fill="#1DA1F2"
                                  />
                                </svg>
                              </div>
                              <span
                                class="c52 c53"
                              >
                                Twitter
                              </span>
                            </a>
                          </div>
                        </div>
                        <div
                          class="c45"
                        >
                          <div
                            class=""
                          >
                            <a
                              aria-disabled="false"
                              class="c46 c47 c48 c49"
                              href="https://forum.strapi.io"
                              rel="noreferrer noopener"
                              target="_blank"
                            >
                              <div
                                aria-hidden="true"
                                class="c50 c51"
                              >
                                <svg
                                  class="c57"
                                  fill="none"
                                  height="1em"
                                  viewBox="0 0 24 24"
                                  width="1em"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M12.103 0C5.533 0 0 5.278 0 11.79V24l12.1-.012c6.57 0 11.9-5.481 11.9-11.992C24 5.486 18.666 0 12.103 0z"
                                    fill="#231F20"
                                  />
                                  <path
                                    d="M12.22 4.564a7.43 7.43 0 00-3.644.956 7.346 7.346 0 00-2.692 2.614 7.26 7.26 0 00-.149 7.22L4.4 19.606l4.793-1.072a7.433 7.433 0 006.355-.14 7.36 7.36 0 002.513-2.057 7.28 7.28 0 001.372-2.93 7.243 7.243 0 00-.035-3.228A7.281 7.281 0 0017.96 7.28a7.365 7.365 0 00-2.557-2.002 7.432 7.432 0 00-3.178-.715h-.007z"
                                    fill="#FFF9AE"
                                  />
                                  <path
                                    d="M18.071 7.426a7.262 7.262 0 011.51 4.499 7.264 7.264 0 01-1.595 4.47 7.38 7.38 0 01-4.028 2.558 7.437 7.437 0 01-4.765-.43L4.4 19.61l4.88-.571a7.432 7.432 0 005.181.858 7.381 7.381 0 004.443-2.778 7.258 7.258 0 00-.833-9.693z"
                                    fill="#00AEEF"
                                  />
                                  <path
                                    d="M16.713 6.078a7.253 7.253 0 01.86 8.928 7.361 7.361 0 01-3.736 2.962 7.437 7.437 0 01-4.784.065L4.4 19.61l4.793-1.075a7.436 7.436 0 005.24.313 7.362 7.362 0 004.123-3.22 7.249 7.249 0 00.914-5.123 7.296 7.296 0 00-2.757-4.427z"
                                    fill="#00A94F"
                                  />
                                  <path
                                    d="M6.176 15.515a7.246 7.246 0 01-.26-4.876 7.312 7.312 0 012.9-3.95 7.427 7.427 0 019.26.735 7.387 7.387 0 00-4.603-2.771 7.431 7.431 0 00-5.277 1.068A7.311 7.311 0 005.06 10.06a7.249 7.249 0 00.676 5.294L4.4 19.607l1.776-4.092z"
                                    fill="#F15D22"
                                  />
                                  <path
                                    d="M5.735 15.353a7.25 7.25 0 01-.764-4.818 7.294 7.294 0 012.465-4.222 7.415 7.415 0 014.596-1.744 7.42 7.42 0 014.681 1.509 7.404 7.404 0 00-4.865-2.26 7.421 7.421 0 00-5.12 1.61 7.293 7.293 0 00-2.66 4.626A7.256 7.256 0 005.28 15.24l-.877 4.37 1.332-4.257z"
                                    fill="#E31B23"
                                  />
                                </svg>
                              </div>
                              <span
                                class="c52 c53"
                              >
                                Forum
                              </span>
                            </a>
                          </div>
                        </div>
                        <div
                          class="c45"
                        >
                          <div
                            class=""
                          >
                            <a
                              aria-disabled="false"
                              class="c46 c47 c48 c49"
                              href="https://strapi.io/blog?utm_source=referral&utm_medium=admin&utm_campaign=career%20page"
                              rel="noreferrer noopener"
                              target="_blank"
                            >
                              <div
                                aria-hidden="true"
                                class="c50 c51"
                              >
                                <svg
                                  class="c58"
                                  fill="none"
                                  height="1em"
                                  viewBox="0 0 80 80"
                                  width="1em"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M0 27.7c0-13 0-19.6 4-23.6C8.2 0 14.8 0 27.8 0h24.6C65.4 0 72 0 76 4c4 4.2 4 10.8 4 23.8v24.6c0 13 0 19.6-4 23.6-4.2 4-10.8 4-23.8 4H27.7c-13 0-19.6 0-23.6-4C0 71.8 0 65.2 0 52.2V27.7z"
                                    fill="#4945FF"
                                  />
                                  <path
                                    clip-rule="evenodd"
                                    d="M55.2 24.3h-27V38H42v13.7h13.7V24.8c0-.3-.2-.5-.5-.5z"
                                    fill="#fff"
                                    fill-rule="evenodd"
                                  />
                                  <path
                                    d="M41.5 38h.5v.5h-.5z"
                                    fill="#fff"
                                  />
                                  <path
                                    d="M28.3 38h13.2c.3 0 .5.2.5.5v13.2H28.8a.5.5 0 01-.5-.5V38zM42 51.7h13.7L42.5 65c-.2.2-.5 0-.5-.2v-13zM28.3 38H15.2a.3.3 0 01-.2-.5l13.3-13.2V38z"
                                    fill="#9593FF"
                                  />
                                </svg>
                              </div>
                              <span
                                class="c52 c53"
                              >
                                Blog
                              </span>
                            </a>
                          </div>
                        </div>
                        <div
                          class="c45"
                        >
                          <div
                            class=""
                          >
                            <a
                              aria-disabled="false"
                              class="c46 c47 c48 c49"
                              href="https://strapi.io/careers?utm_source=referral&utm_medium=admin&utm_campaign=blog"
                              rel="noreferrer noopener"
                              target="_blank"
                            >
                              <div
                                aria-hidden="true"
                                class="c50 c51"
                              >
                                <svg
                                  class="c58"
                                  fill="none"
                                  height="1em"
                                  viewBox="0 0 80 80"
                                  width="1em"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M0 27.7c0-13 0-19.6 4-23.6C8.2 0 14.8 0 27.8 0h24.6C65.4 0 72 0 76 4c4 4.2 4 10.8 4 23.8v24.6c0 13 0 19.6-4 23.6-4.2 4-10.8 4-23.8 4H27.7c-13 0-19.6 0-23.6-4C0 71.8 0 65.2 0 52.2V27.7z"
                                    fill="#4945FF"
                                  />
                                  <path
                                    clip-rule="evenodd"
                                    d="M55.2 24.3h-27V38H42v13.7h13.7V24.8c0-.3-.2-.5-.5-.5z"
                                    fill="#fff"
                                    fill-rule="evenodd"
                                  />
                                  <path
                                    d="M41.5 38h.5v.5h-.5z"
                                    fill="#fff"
                                  />
                                  <path
                                    d="M28.3 38h13.2c.3 0 .5.2.5.5v13.2H28.8a.5.5 0 01-.5-.5V38zM42 51.7h13.7L42.5 65c-.2.2-.5 0-.5-.2v-13zM28.3 38H15.2a.3.3 0 01-.2-.5l13.3-13.2V38z"
                                    fill="#9593FF"
                                  />
                                </svg>
                              </div>
                              <span
                                class="c52 c53"
                              >
                                We are hiring!
                              </span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `);
  });

  it('should show regular message when there are collectionTypes and singletypes', () => {
    useModels.mockImplementation(() => ({
      isLoading: false,
      collectionTypes: [{ uuid: 102 }],
      singleTypes: [{ isDisplayed: true }],
    }));

    render(App);

    expect(
      screen.getByText(
        'We hope you are making progress on your project! Feel free to read the latest news about Strapi. We are giving our best to improve the product based on your feedback.'
      )
    ).toBeInTheDocument();
  });
});
