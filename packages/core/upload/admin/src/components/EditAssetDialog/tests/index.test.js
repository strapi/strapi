/**
 *
 * Tests for EditAssetDialog
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { IntlProvider } from 'react-intl';
import { EditAssetDialog } from '../index';
import en from '../../../translations/en.json';

const messageForPlugin = Object.keys(en).reduce((acc, curr) => {
  acc[curr] = `upload.${en[curr]}`;

  return acc;
}, {});

describe('<EditAssetDialog />', () => {
  it('renders and matches the snapshot', () => {
    const asset = {
      id: 8,
      name: 'Screenshot 2.png',
      alternativeText: null,
      caption: null,
      width: 1476,
      height: 780,
      formats: {
        thumbnail: {
          name: 'thumbnail_Screenshot 2.png',
          hash: 'thumbnail_Screenshot_2_5d4a574d61',
          ext: '.png',
          mime: 'image/png',
          width: 245,
          height: 129,
          size: 10.7,
          path: null,
          url: '/uploads/thumbnail_Screenshot_2_5d4a574d61.png',
        },
        large: {
          name: 'large_Screenshot 2.png',
          hash: 'large_Screenshot_2_5d4a574d61',
          ext: '.png',
          mime: 'image/png',
          width: 1000,
          height: 528,
          size: 97.1,
          path: null,
          url: '/uploads/large_Screenshot_2_5d4a574d61.png',
        },
        medium: {
          name: 'medium_Screenshot 2.png',
          hash: 'medium_Screenshot_2_5d4a574d61',
          ext: '.png',
          mime: 'image/png',
          width: 750,
          height: 396,
          size: 58.7,
          path: null,
          url: '/uploads/medium_Screenshot_2_5d4a574d61.png',
        },
        small: {
          name: 'small_Screenshot 2.png',
          hash: 'small_Screenshot_2_5d4a574d61',
          ext: '.png',
          mime: 'image/png',
          width: 500,
          height: 264,
          size: 31.06,
          path: null,
          url: '/uploads/small_Screenshot_2_5d4a574d61.png',
        },
      },
      hash: 'Screenshot_2_5d4a574d61',
      ext: '.png',
      mime: 'image/png',
      size: 102.01,
      url: '/uploads/Screenshot_2_5d4a574d61.png',
      previewUrl: null,
      provider: 'local',
      provider_metadata: null,
      createdAt: '2021-10-04T09:42:31.670Z',
      updatedAt: '2021-10-04T09:42:31.670Z',
    };

    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messageForPlugin} defaultLocale="en">
          <EditAssetDialog asset={asset} onClose={jest.fn()} />
        </IntlProvider>
      </ThemeProvider>,
      { container: document.body }
    );

    expect(container).toMatchInlineSnapshot(`
      .c0 {
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

      .c2 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 2px 15px rgba(33,33,52,0.1);
      }

      .c4 {
        background: #f6f6f9;
        padding-top: 16px;
        padding-right: 20px;
        padding-bottom: 16px;
        padding-left: 20px;
      }

      .c11 {
        padding-top: 24px;
        padding-right: 40px;
        padding-bottom: 24px;
        padding-left: 40px;
      }

      .c1 {
        position: fixed;
        z-index: 4;
        inset: 0;
        background: rgb(220,220,228,0.8);
        padding: 0 40px;
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
      }

      .c3 {
        width: 51.875rem;
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

      .c39 {
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

      .c9 {
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

      .c9 svg {
        height: 12px;
        width: 12px;
      }

      .c9 svg > g,
      .c9 svg path {
        fill: #ffffff;
      }

      .c9[aria-disabled='true'] {
        pointer-events: none;
      }

      .c9:after {
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

      .c9:focus-visible {
        outline: none;
      }

      .c9:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c10 {
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

      .c10 svg > g,
      .c10 svg path {
        fill: #8e8ea9;
      }

      .c10:hover svg > g,
      .c10:hover svg path {
        fill: #666687;
      }

      .c10:active svg > g,
      .c10:active svg path {
        fill: #a5a5ba;
      }

      .c10[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c10[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c5 {
        border-bottom: 1px solid #eaeaef;
      }

      .c38 {
        border-top: 1px solid #eaeaef;
      }

      .c40 > * + * {
        margin-left: 8px;
      }

      .c12 {
        overflow: auto;
        max-height: 60vh;
      }

      .c30 {
        font-size: 0.75rem;
        line-height: 1.33;
        color: #4a4a6a;
        text-transform: uppercase;
      }

      .c7 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c27 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c29 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #4a4a6a;
      }

      .c8 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c28 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c24 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c24 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c24 > * + * {
        margin-top: 12px;
      }

      .c26 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c26 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c26 > * + * {
        margin-top: 4px;
      }

      .c19 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: row;
        -ms-flex-direction: row;
        flex-direction: row;
      }

      .c19 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c19 > * + * {
        margin-left: 4px;
      }

      .c13 {
        display: grid;
        grid-template-columns: repeat(12,1fr);
        gap: 16px;
      }

      .c14 {
        grid-column: span 6;
      }

      .c44 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c41 {
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

      .c41 svg {
        height: 12px;
        width: 12px;
      }

      .c41 svg > g,
      .c41 svg path {
        fill: #ffffff;
      }

      .c41[aria-disabled='true'] {
        pointer-events: none;
      }

      .c41:after {
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

      .c41:focus-visible {
        outline: none;
      }

      .c41:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c42 {
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

      .c42 .sc-iitrMj {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c42 .c43 {
        color: #ffffff;
      }

      .c42[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c42[aria-disabled='true'] .c43 {
        color: #666687;
      }

      .c42[aria-disabled='true'] svg > g,
      .c42[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c42[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c42[aria-disabled='true']:active .c43 {
        color: #666687;
      }

      .c42[aria-disabled='true']:active svg > g,
      .c42[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c42:hover {
        background-color: #f6f6f9;
      }

      .c42:active {
        background-color: #eaeaef;
      }

      .c42 .c43 {
        color: #32324d;
      }

      .c42 svg > g,
      .c42 svg path {
        fill: #32324d;
      }

      .c45 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #d9d8ff;
        background: #f0f0ff;
      }

      .c45 .sc-iitrMj {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c45 .c43 {
        color: #ffffff;
      }

      .c45[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c45[aria-disabled='true'] .c43 {
        color: #666687;
      }

      .c45[aria-disabled='true'] svg > g,
      .c45[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c45[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c45[aria-disabled='true']:active .c43 {
        color: #666687;
      }

      .c45[aria-disabled='true']:active svg > g,
      .c45[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c45:hover {
        background-color: #ffffff;
      }

      .c45:active {
        background-color: #ffffff;
        border: 1px solid #4945ff;
      }

      .c45:active .c43 {
        color: #4945ff;
      }

      .c45:active svg > g,
      .c45:active svg path {
        fill: #4945ff;
      }

      .c45 .c43 {
        color: #271fe0;
      }

      .c45 svg > g,
      .c45 svg path {
        fill: #271fe0;
      }

      .c46 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 8px 16px;
        background: #4945ff;
        border: none;
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c46 .sc-iitrMj {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c46 .c43 {
        color: #ffffff;
      }

      .c46[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c46[aria-disabled='true'] .c43 {
        color: #666687;
      }

      .c46[aria-disabled='true'] svg > g,
      .c46[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c46[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c46[aria-disabled='true']:active .c43 {
        color: #666687;
      }

      .c46[aria-disabled='true']:active svg > g,
      .c46[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c46:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c46:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c33 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c37 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c32 {
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c36 {
        border: none;
        border-radius: 4px;
        padding-left: 16px;
        padding-right: 16px;
        color: #32324d;
        font-weight: 400;
        font-size: 0.875rem;
        display: block;
        width: 100%;
      }

      .c36::-webkit-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c36::-moz-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c36:-ms-input-placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c36::placeholder {
        color: #8e8ea9;
        opacity: 1;
      }

      .c36[aria-disabled='true'] {
        background: inherit;
        color: inherit;
      }

      .c36:focus {
        outline: none;
        box-shadow: none;
      }

      .c35 {
        border: 1px solid #dcdce4;
        border-radius: 4px;
        background: #ffffff;
        height: 2rem;
        outline: none;
        box-shadow: 0;
        -webkit-transition-property: border-color,box-shadow,fill;
        transition-property: border-color,box-shadow,fill;
        -webkit-transition-duration: 0.2s;
        transition-duration: 0.2s;
      }

      .c35:focus-within {
        border: 1px solid #4945ff;
        box-shadow: #4945ff 0px 0px 0px 2px;
      }

      .c31 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c31 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c31 > * + * {
        margin-top: 4px;
      }

      .c15 {
        background: #eaeaef;
        border-radius: 4px;
        border-color: #dcdce4;
        border: 1px solid #dcdce4;
      }

      .c25 {
        background: #f6f6f9;
        padding-top: 16px;
        padding-right: 24px;
        padding-bottom: 16px;
        padding-left: 24px;
        border-radius: 4px;
      }

      .c47 {
        background: #212134;
        padding: 8px;
        border-radius: 4px;
      }

      .c49 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #ffffff;
      }

      .c48 {
        position: absolute;
        z-index: 4;
        display: none;
      }

      .c20 {
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

      .c20 svg {
        height: 12px;
        width: 12px;
      }

      .c20 svg > g,
      .c20 svg path {
        fill: #ffffff;
      }

      .c20[aria-disabled='true'] {
        pointer-events: none;
      }

      .c20:after {
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

      .c20:focus-visible {
        outline: none;
      }

      .c20:focus-visible:after {
        border-radius: 8px;
        content: '';
        position: absolute;
        top: -5px;
        bottom: -5px;
        left: -5px;
        right: -5px;
        border: 2px solid #4945ff;
      }

      .c21 {
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

      .c21 svg > g,
      .c21 svg path {
        fill: #8e8ea9;
      }

      .c21:hover svg > g,
      .c21:hover svg path {
        fill: #666687;
      }

      .c21:active svg > g,
      .c21:active svg path {
        fill: #a5a5ba;
      }

      .c21[aria-disabled='true'] {
        background-color: #eaeaef;
      }

      .c21[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c16 {
        padding-right: 12px;
        padding-left: 12px;
      }

      .c17 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c23 {
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

      .c22 img {
        margin: 0;
        padding: 0;
        max-height: 100%;
        max-width: 100%;
      }

      .c18 {
        height: 3.25rem;
      }

      @media (max-width:68.75rem) {
        .c14 {
          grid-column: span;
        }
      }

      @media (max-width:34.375rem) {
        .c14 {
          grid-column: span 12;
        }
      }

      <body
        class="lock-body-scroll"
      >
        <div
          class="c0"
        >
          <p
            aria-live="polite"
            aria-relevant="all"
            id="live-region-log"
            role="log"
          />
          <p
            aria-live="polite"
            aria-relevant="all"
            id="live-region-status"
            role="status"
          />
          <p
            aria-live="assertive"
            aria-relevant="all"
            id="live-region-alert"
            role="alert"
          />
        </div>
        <div
          data-react-portal="true"
        >
          <div
            class="c1"
          >
            <div>
              <div
                aria-labelledby="title"
                aria-modal="true"
                class="c2 c3"
                role="dialog"
              >
                <div
                  class="c4 c5"
                >
                  <div
                    class="c6"
                  >
                    <h2
                      class="c7 c8"
                      id="title"
                    >
                      Details
                    </h2>
                    <button
                      aria-disabled="false"
                      aria-label="Close the modal"
                      class="c9 c10"
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
                          d="M24 2.417L21.583 0 12 9.583 2.417 0 0 2.417 9.583 12 0 21.583 2.417 24 12 14.417 21.583 24 24 21.583 14.417 12 24 2.417z"
                          fill="#212134"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  class="c11 c12"
                >
                  <div
                    class="c13"
                  >
                    <div
                      class="c14"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c15"
                        >
                          <div
                            class="c16 c17 c18"
                          >
                            <div
                              class="c19"
                            >
                              <span>
                                <button
                                  aria-disabled="false"
                                  aria-labelledby="tooltip-1"
                                  class="c20 c21"
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
                                      d="M3.236 6.149a.2.2 0 00-.197.233L6 24h12l2.96-17.618a.2.2 0 00-.196-.233H3.236zM21.8 1.983c.11 0 .2.09.2.2v1.584a.2.2 0 01-.2.2H2.2a.2.2 0 01-.2-.2V2.183c0-.11.09-.2.2-.2h5.511c.9 0 1.631-1.09 1.631-1.983h5.316c0 .894.73 1.983 1.631 1.983H21.8z"
                                      fill="#32324D"
                                    />
                                  </svg>
                                </button>
                              </span>
                              <span>
                                <button
                                  aria-disabled="false"
                                  aria-labelledby="tooltip-3"
                                  class="c20 c21"
                                  tabindex="0"
                                  type="button"
                                >
                                  <svg
                                    fill="none"
                                    height="1em"
                                    viewBox="0 0 24 25"
                                    width="1em"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      clip-rule="evenodd"
                                      d="M13.571 5.85H10.43v8.47H2.487a.2.2 0 00-.14.343l9.512 9.401a.2.2 0 00.282 0l9.513-9.401a.2.2 0 00-.14-.342H13.57V5.85zM2.2 3.027a.2.2 0 01-.2-.2V.402c0-.11.09-.2.2-.2h19.6c.11 0 .2.09.2.2v2.423a.2.2 0 01-.2.2H2.2z"
                                      fill="#212134"
                                      fill-rule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </span>
                              <span>
                                <button
                                  aria-disabled="false"
                                  aria-labelledby="tooltip-5"
                                  class="c20 c21"
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
                                      d="M21.415 1.344a6.137 6.137 0 00-8.525.838L11.095 4.33a1.53 1.53 0 102.35 1.963l1.794-2.148a3.054 3.054 0 014.365-.324 3.117 3.117 0 01.255 4.301l-3.73 4.467-.035.038a3.048 3.048 0 01-4.53.078 1.531 1.531 0 00-2.241 2.086 6.114 6.114 0 009.159-.245l3.721-4.454a6.289 6.289 0 001.418-4.62 6.01 6.01 0 00-2.206-4.128z"
                                      fill="#212134"
                                    />
                                    <path
                                      d="M10.399 17.884l-1.604 1.92a3.118 3.118 0 01-4.278.513 3.052 3.052 0 01-.457-4.353l3.795-4.542.028-.031a3.042 3.042 0 014.584-.022 1.529 1.529 0 001.794.37c.197-.094.37-.228.51-.395l.018-.022a1.51 1.51 0 00-.025-1.977 6.11 6.11 0 00-9.27.126l-3.784 4.53a6.137 6.137 0 00.692 8.539 6.01 6.01 0 004.454 1.437 6.289 6.289 0 004.294-2.217l1.598-1.913a1.53 1.53 0 00-2.35-1.963z"
                                      fill="#212134"
                                    />
                                  </svg>
                                </button>
                              </span>
                              <span>
                                <button
                                  aria-disabled="false"
                                  aria-labelledby="tooltip-7"
                                  class="c20 c21"
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
                                      d="M20.571 21.429h-3.428V24h3.428v-2.571zM20.571 17.143V3.429H7.714v3.428h9.429v10.286H6.857V0H3.43v3.429H0v3.428h3.429v13.714H24v-3.428h-3.429z"
                                      fill="#212134"
                                    />
                                  </svg>
                                </button>
                              </span>
                            </div>
                          </div>
                          <div
                            class="c22"
                          >
                            <img
                              alt="Screenshot 2.png"
                              src="http://localhost:1337/uploads/Screenshot_2_5d4a574d61.png"
                            />
                          </div>
                          <div
                            class="c16 c23 c18"
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      class="c14"
                    >
                      <div
                        class=""
                      >
                        <div
                          class="c24"
                        >
                          <div
                            class="c25"
                          >
                            <div
                              class="c13"
                            >
                              <div
                                class="c14"
                              >
                                <div
                                  class=""
                                >
                                  <div
                                    class="c26"
                                  >
                                    <span
                                      class="c27 c8 c28"
                                    >
                                      Size
                                    </span>
                                    <span
                                      class="c29"
                                    >
                                      102KB
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                class="c14"
                              >
                                <div
                                  class=""
                                >
                                  <div
                                    class="c26"
                                  >
                                    <span
                                      class="c27 c8 c28"
                                    >
                                      Date
                                    </span>
                                    <span
                                      class="c29"
                                    >
                                      04/10/2021
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                class="c14"
                              >
                                <div
                                  class=""
                                >
                                  <div
                                    class="c26"
                                  >
                                    <span
                                      class="c27 c8 c28"
                                    >
                                      Dimensions
                                    </span>
                                    <span
                                      class="c29"
                                    >
                                      780✕1476
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                class="c14"
                              >
                                <div
                                  class=""
                                >
                                  <div
                                    class="c26"
                                  >
                                    <span
                                      class="c27 c8 c28"
                                    >
                                      Extension
                                    </span>
                                    <span
                                      class="c30"
                                    >
                                      png
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div>
                              <div
                                class="c31"
                              >
                                <div
                                  class="c32"
                                >
                                  <label
                                    class="c33"
                                    for="textinput-1"
                                  >
                                    File name
                                  </label>
                                </div>
                                <div
                                  class="c34 c35"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c36"
                                    id="textinput-1"
                                    name="filename"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div>
                              <div
                                class="c31"
                              >
                                <div
                                  class="c32"
                                >
                                  <label
                                    class="c33"
                                    for="textinput-2"
                                  >
                                    Alternative text
                                  </label>
                                </div>
                                <div
                                  class="c34 c35"
                                >
                                  <input
                                    aria-describedby="textinput-2-hint"
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c36"
                                    id="textinput-2"
                                    name="altText"
                                  />
                                </div>
                                <p
                                  class="c37"
                                  id="textinput-2-hint"
                                >
                                  This text will be displayed if the asset can’t be shown.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div>
                              <div
                                class="c31"
                              >
                                <div
                                  class="c32"
                                >
                                  <label
                                    class="c33"
                                    for="textinput-3"
                                  >
                                    Caption
                                  </label>
                                </div>
                                <div
                                  class="c34 c35"
                                >
                                  <input
                                    aria-disabled="false"
                                    aria-invalid="false"
                                    class="c36"
                                    id="textinput-3"
                                    name="caption"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="c4 c38"
                >
                  <div
                    class="c6"
                  >
                    <div
                      class="c39 c40"
                    >
                      <button
                        aria-disabled="false"
                        class="c41 c42"
                        type="button"
                      >
                        <span
                          class="c43 c44"
                        >
                          Cancel
                        </span>
                      </button>
                    </div>
                    <div
                      class="c39 c40"
                    >
                      <button
                        aria-disabled="false"
                        class="c41 c45"
                        type="button"
                      >
                        <span
                          class="c43 c44"
                        >
                          Replace media
                        </span>
                      </button>
                      <button
                        aria-disabled="false"
                        class="c41 c46"
                        type="button"
                      >
                        <span
                          class="c43 c44"
                        >
                          Finish
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          data-react-portal="true"
        >
          <div
            class="c47 c48"
            id="tooltip-1"
            role="tooltip"
          >
            <p
              class="c49"
            >
              Delete
            </p>
          </div>
        </div>
        <div
          data-react-portal="true"
        >
          <div
            class="c47 c48"
            id="tooltip-3"
            role="tooltip"
          >
            <p
              class="c49"
            >
              Download
            </p>
          </div>
        </div>
        <div
          data-react-portal="true"
        >
          <div
            class="c47 c48"
            id="tooltip-5"
            role="tooltip"
          >
            <p
              class="c49"
            >
              Copy link
            </p>
          </div>
        </div>
        <div
          data-react-portal="true"
        >
          <div
            class="c47 c48"
            id="tooltip-7"
            role="tooltip"
          >
            <p
              class="c49"
            >
              Crop
            </p>
          </div>
        </div>
      </body>
    `);
  });
});
