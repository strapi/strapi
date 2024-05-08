import React from 'react';

import { render, screen, waitFor } from '@strapi/strapi/admin/test';

import { EmailTemplatesPage } from '../index';

jest.mock('@strapi/strapi/admin', () => ({
  ...jest.requireActual('@strapi/strapi/admin'),
  useRBAC: jest.fn().mockImplementation(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true },
  })),
}));

describe('ADMIN | Pages | Settings | Email Templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders and matches the snapshot', async () => {
    const { container } = render(<EmailTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Reset password')).toBeInTheDocument();
    });

    expect(container).toMatchInlineSnapshot(`
      .c0 {
        margin-inline-start: -250px;
        position: fixed;
        left: 50%;
        top: 4.6rem;
        z-index: 10;
        width: 50rem;
      }

      .c3 {
        background: #f6f6f9;
        padding-block-start: 40px;
        padding-inline-end: 56px;
        padding-block-end: 40px;
        padding-inline-start: 56px;
      }

      .c5 {
        min-width: 0;
      }

      .c8 {
        padding-inline-end: 56px;
        padding-inline-start: 56px;
      }

      .c9 {
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33, 33, 52, 0.1);
      }

      .c11 {
        position: relative;
      }

      .c13 {
        padding-inline-end: 24px;
        padding-inline-start: 24px;
      }

      .c18 {
        width: 1%;
      }

      .c25 {
        background: #ffffff;
        padding-block: 8px;
        padding-inline: 8px;
        border-radius: 4px;
        border-width: 0;
        border-color: #dcdce4;
        cursor: pointer;
      }

      .c7 {
        font-weight: 600;
        font-size: 3.2rem;
        line-height: 1.25;
        color: currentcolor;
      }

      .c22 {
        font-weight: 600;
        font-size: 1.1rem;
        line-height: 1.45;
        text-transform: uppercase;
        color: #666687;
      }

      .c24 {
        font-size: 1.4rem;
        line-height: 1.43;
        color: currentcolor;
      }

      .c1 {
        align-items: stretch;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .c26 {
        align-items: center;
        display: flex;
        flex-direction: row;
        justify-content: center;
      }

      .c4 {
        align-items: center;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }

      .c6 {
        align-items: center;
        display: flex;
        flex-direction: row;
      }

      .c20 {
        border: 0;
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
      }

      .c27 {
        position: relative;
        outline: none;
      }

      .c27[aria-disabled='true'] {
        pointer-events: none;
      }

      .c27:after {
        transition-property: all;
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
        border-color: #dcdce4;
        height: 3.2rem;
        width: 3.2rem;
        color: #8e8ea9;
      }

      .c28:hover,
      .c28:focus {
        color: #666687;
      }

      .c28[aria-disabled='true'] {
        color: #666687;
      }

      .c2:focus-visible {
        outline: none;
      }

      .c10 {
        overflow: hidden;
        border: 1px solid #eaeaef;
      }

      .c15 {
        width: 100%;
        white-space: nowrap;
      }

      .c12:before {
        background: linear-gradient(90deg, #c0c0cf 0%, rgba(0, 0, 0, 0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33, 33, 52, 0.1);
        width: 8px;
        left: 0;
      }

      .c12:after {
        background: linear-gradient(270deg, #c0c0cf 0%, rgba(0, 0, 0, 0) 100%);
        opacity: 0.2;
        position: absolute;
        height: 100%;
        box-shadow: 0px 1px 4px rgba(33, 33, 52, 0.1);
        width: 8px;
        right: 0;
        top: 0;
      }

      .c14 {
        overflow-x: auto;
      }

      .c23 tr:last-of-type {
        border-bottom: none;
      }

      .c16 {
        border-bottom: 1px solid #eaeaef;
      }

      .c17 {
        border-bottom: 1px solid #eaeaef;
      }

      .c17 td,
      .c17 th {
        padding: 16px;
      }

      .c17 td:first-of-type,
      .c17 th:first-of-type {
        padding: 0 4px;
      }

      .c17 th {
        padding-top: 0;
        padding-bottom: 0;
        height: 5.6rem;
      }

      .c19 {
        vertical-align: middle;
        text-align: left;
        color: #666687;
        outline-offset: -4px;
      }

      .c19 input {
        vertical-align: sub;
      }

      .c21 svg {
        height: 0.4rem;
      }

      <div>
        <div
          class="c0 c1"
        />
        <main
          aria-busy="false"
          aria-labelledby="main-content-title"
          class="c2"
          id="main-content"
          tabindex="-1"
        >
          <div
            style="height: 0px;"
          >
            <div
              class="c3"
              data-strapi-header="true"
            >
              <div
                class="c4"
              >
                <div
                  class="c5 c6"
                >
                  <h1
                    class="c7"
                  >
                    Email templates
                  </h1>
                </div>
              </div>
            </div>
          </div>
          <div
            class="c8"
          >
            <div
              class="c9 c10"
            >
              <div
                class="c11 c12"
              >
                <div
                  class="c13 c14"
                >
                  <table
                    aria-colcount="3"
                    aria-rowcount="3"
                    class="c15"
                    role="grid"
                  >
                    <thead
                      class="c16"
                    >
                      <tr
                        aria-rowindex="1"
                        class="c17"
                      >
                        <th
                          aria-colindex="1"
                          class="c18 c19"
                          role="gridcell"
                          tabindex="0"
                        >
                          <div
                            class="c6"
                          >
                            <span
                              class="c20"
                            >
                              icon
                            </span>
                            <span
                              class="c21"
                            />
                          </div>
                        </th>
                        <th
                          aria-colindex="2"
                          class="c19"
                          role="gridcell"
                          tabindex="-1"
                        >
                          <div
                            class="c6"
                          >
                            <span
                              class="c22"
                            >
                              name
                            </span>
                            <span
                              class="c21"
                            />
                          </div>
                        </th>
                        <th
                          aria-colindex="3"
                          class="c18 c19"
                          role="gridcell"
                          tabindex="-1"
                        >
                          <div
                            class="c6"
                          >
                            <span
                              class="c20"
                            >
                              action
                            </span>
                            <span
                              class="c21"
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      class="c23"
                    >
                      <tr
                        aria-rowindex="2"
                        class="c17"
                      >
                        <td
                          aria-colindex="1"
                          class="c19"
                          role="gridcell"
                          tabindex="-1"
                        >
                          <svg
                            aria-label="Reset password"
                            fill="currentColor"
                            height="16"
                            viewBox="0 0 32 32"
                            width="16"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M30.5 7v6a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1 0-3h2.137l-2.375-2.173-.047-.046a9.5 9.5 0 1 0-6.84 16.219H16a9.44 9.44 0 0 0 6.519-2.59 1.5 1.5 0 1 1 2.061 2.181A12.43 12.43 0 0 1 16 28.5h-.171a12.5 12.5 0 1 1 8.985-21.368L27.5 9.59V7a1.5 1.5 0 0 1 3 0"
                            />
                          </svg>
                        </td>
                        <td
                          aria-colindex="2"
                          class="c19"
                          role="gridcell"
                          tabindex="-1"
                        >
                          <span
                            class="c24"
                          >
                            Reset password
                          </span>
                        </td>
                        <td
                          aria-colindex="3"
                          class="c19"
                          role="gridcell"
                        >
                          <span>
                            <button
                              aria-disabled="false"
                              aria-labelledby=":r0:"
                              class="c25 c26 c27 c28"
                              tabindex="-1"
                              type="button"
                            >
                              <span
                                class="c20"
                              >
                                Edit a template
                              </span>
                              <svg
                                aria-hidden="true"
                                fill="currentColor"
                                focusable="false"
                                height="16"
                                viewBox="0 0 32 32"
                                width="16"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="m28.414 9.171-5.585-5.586a2 2 0 0 0-2.829 0L4.586 19A1.98 1.98 0 0 0 4 20.414V26a2 2 0 0 0 2 2h5.586A1.98 1.98 0 0 0 13 27.414L28.414 12a2 2 0 0 0 0-2.829M24 13.585 18.414 8l3-3L27 10.585z"
                                />
                              </svg>
                            </button>
                          </span>
                        </td>
                      </tr>
                      <tr
                        aria-rowindex="3"
                        class="c17"
                      >
                        <td
                          aria-colindex="1"
                          class="c19"
                          role="gridcell"
                          tabindex="-1"
                        >
                          <svg
                            aria-label="Email address confirmation"
                            fill="currentColor"
                            height="16"
                            viewBox="0 0 32 32"
                            width="16"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="m29.061 10.061-16 16a1.5 1.5 0 0 1-2.125 0l-7-7a1.504 1.504 0 0 1 2.125-2.125L12 22.875 26.939 7.939a1.502 1.502 0 1 1 2.125 2.125z"
                            />
                          </svg>
                        </td>
                        <td
                          aria-colindex="2"
                          class="c19"
                          role="gridcell"
                          tabindex="-1"
                        >
                          <span
                            class="c24"
                          >
                            Email address confirmation
                          </span>
                        </td>
                        <td
                          aria-colindex="3"
                          class="c19"
                          role="gridcell"
                        >
                          <span>
                            <button
                              aria-disabled="false"
                              aria-labelledby=":r2:"
                              class="c25 c26 c27 c28"
                              tabindex="-1"
                              type="button"
                            >
                              <span
                                class="c20"
                              >
                                Edit a template
                              </span>
                              <svg
                                aria-hidden="true"
                                fill="currentColor"
                                focusable="false"
                                height="16"
                                viewBox="0 0 32 32"
                                width="16"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="m28.414 9.171-5.585-5.586a2 2 0 0 0-2.829 0L4.586 19A1.98 1.98 0 0 0 4 20.414V26a2 2 0 0 0 2 2h5.586A1.98 1.98 0 0 0 13 27.414L28.414 12a2 2 0 0 0 0-2.829M24 13.585 18.414 8l3-3L27 10.585z"
                                />
                              </svg>
                            </button>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
        <span
          class="c20"
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
        </span>
      </div>
    `);
  });
});
