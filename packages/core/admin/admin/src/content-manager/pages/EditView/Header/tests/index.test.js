/**
 *
 * Tests for Header
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import Theme from '../../../../../components/Theme';
import { Header } from '../index';
import components from '../utils/tests/data/compos-schema.json';
import ct from '../utils/tests/data/ct-schema.json';

const defaultProps = {
  allowedActions: { canUpdate: true, canCreate: true, canPublish: true },
  componentLayouts: components,
  initialData: {},
  isCreatingEntry: true,
  isSingleType: false,
  hasDraftAndPublish: false,
  layout: ct,
  modifiedData: {},
  onPublish: jest.fn(),
  onUnpublish: jest.fn(),
  status: 'resolved',
};

const makeApp = (props = defaultProps) => {
  return (
    <MemoryRouter>
      <IntlProvider locale="en" defaultLocale="en" messages={{}}>
        <Theme>
          <Header {...props} />
        </Theme>
      </IntlProvider>
    </MemoryRouter>
  );
};

describe('CONTENT MANAGER | EditView | Header', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(makeApp());

    expect(firstChild).toMatchInlineSnapshot(`
      .c0 {
        background: #f6f6f9;
        padding-top: 24px;
        padding-right: 56px;
        padding-bottom: 56px;
        padding-left: 56px;
      }

      .c1 {
        padding-bottom: 12px;
      }

      .c8 {
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

      .c10 {
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.25;
        color: #32324d;
      }

      .c15 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c16 {
        font-size: 1rem;
        line-height: 1.5;
      }

      .c14 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c11 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        background: #ffffff;
        border: 1px solid #dcdce4;
      }

      .c11 svg {
        height: 12px;
        width: 12px;
      }

      .c11 svg > g,
      .c11 svg path {
        fill: #ffffff;
      }

      .c11[aria-disabled='true'] {
        pointer-events: none;
      }

      .c12 {
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

      .c12 .sc-lmoMya {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c12 .c13 {
        color: #ffffff;
      }

      .c12[aria-disabled='true'] {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c12[aria-disabled='true'] .c13 {
        color: #666687;
      }

      .c12[aria-disabled='true'] svg > g,
      .c12[aria-disabled='true'] svg path {
        fill: #666687;
      }

      .c12[aria-disabled='true']:active {
        border: 1px solid #dcdce4;
        background: #eaeaef;
      }

      .c12[aria-disabled='true']:active .c13 {
        color: #666687;
      }

      .c12[aria-disabled='true']:active svg > g,
      .c12[aria-disabled='true']:active svg path {
        fill: #666687;
      }

      .c12:hover {
        border: 1px solid #7b79ff;
        background: #7b79ff;
      }

      .c12:active {
        border: 1px solid #4945ff;
        background: #4945ff;
      }

      .c5 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #4945ff;
      }

      .c6 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c7 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c3 {
        padding-right: 8px;
      }

      .c2 {
        display: -webkit-inline-box;
        display: -webkit-inline-flex;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        text-transform: uppercase;
        -webkit-text-decoration: none;
        text-decoration: none;
      }

      .c2 svg path {
        fill: #4945ff;
      }

      .c2 svg {
        font-size: 0.625rem;
      }

      .c4 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
      }

      <div
        style="height: 0px;"
      >
        <div
          class="c0"
          data-strapi-header="true"
        >
          <div
            class="c1"
          >
            <a
              aria-current="page"
              class="c2 active"
              href="/"
            >
              <span
                aria-hidden="true"
                class="c3 c4"
              >
                <svg
                  fill="none"
                  height="1em"
                  viewBox="0 0 24 24"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M24 13.3a.2.2 0 01-.2.2H5.74l8.239 8.239a.2.2 0 010 .282L12.14 23.86a.2.2 0 01-.282 0L.14 12.14a.2.2 0 010-.282L11.86.14a.2.2 0 01.282 0L13.98 1.98a.2.2 0 010 .282L5.74 10.5H23.8c.11 0 .2.09.2.2v2.6z"
                    fill="#212134"
                  />
                </svg>
              </span>
              <span
                class="c5 c6 c7"
              >
                Back
              </span>
            </a>
          </div>
          <div
            class="c8"
          >
            <div
              class="c9"
            >
              <h1
                class="c10"
                id="main-content-title"
              >
                Create an entry
              </h1>
            </div>
            <button
              aria-disabled="true"
              class="c11 c12"
              disabled=""
              type="submit"
            >
              <span
                class="c13 c14"
              >
                Save
              </span>
            </button>
          </div>
          <p
            class="c15 c16"
          >
            API ID  : restaurant
          </p>
        </div>
      </div>
    `);
  });
});
