/**
 *
 * Tests for EditAssetDialog
 *
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { UploadProgress } from '..';
import en from '../../../translations/en.json';

const messageForPlugin = Object.keys(en).reduce((acc, curr) => {
  acc[curr] = `upload.${en[curr]}`;

  return acc;
}, {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const renderCompo = (props) => {
  const target = document.createElement('div');
  document.body.appendChild(target);

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={messageForPlugin} defaultLocale="en">
          <UploadProgress onCancel={jest.fn()} error={undefined} {...props} />
        </IntlProvider>
      </ThemeProvider>
    </QueryClientProvider>,
    { container: target }
  );
};

describe('<UploadProgress />', () => {
  it('renders with no error', () => {
    const {
      container: { firstChild },
    } = renderCompo();

    expect(firstChild).toMatchInlineSnapshot(`
      .c11 {
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c0 {
        background: #eaeaef;
      }

      .c1 {
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

      .c3 {
        width: 100%;
      }

      .c4 {
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
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
      }

      .c5 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c5 > * + * {
        margin-top: 8px;
      }

      .c10 > * {
        margin-left: 0;
        margin-right: 0;
      }

      .c10 > * + * {
        margin-left: 8px;
      }

      .c6 {
        background: #666687;
        border-radius: 4px;
        position: relative;
        width: 78px;
        height: 4px;
      }

      .c6:before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: 4px;
        width: 0%;
        background: #eaeaef;
      }

      .c7 {
        width: 102px;
        height: 8px;
      }

      .c2 {
        border-radius: 4px 4px 0 0;
        width: 100%;
        height: 100%;
      }

      .c8 {
        border: none;
        background: none;
        width: -webkit-min-content;
        width: -moz-min-content;
        width: min-content;
        color: #666687;
      }

      .c8:hover,
      .c8:focus {
        color: #4a4a6a;
      }

      .c8 svg {
        height: 10px;
        width: 10px;
      }

      .c8 svg path {
        fill: currentColor;
      }

      <div
        class="c0 c1 c2"
      >
        <div
          class="c3 c4 c5"
          spacing="2"
          width="100%"
        >
          <div
            aria-label="0/100%"
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow="0"
            class="c6 c7"
            role="progressbar"
            value="0"
          />
          <button
            class="c8"
            type="button"
          >
            <div
              class="c9 c10"
              spacing="2"
            >
              <span
                class="c11"
              >
                Cancel
              </span>
              <svg
                aria-hidden="true"
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
            </div>
          </button>
        </div>
      </div>
    `);
  });

  it('renders with an error', () => {
    const {
      container: { firstChild },
    } = renderCompo({ error: new Error('Something went wrong') });

    expect(firstChild).toMatchInlineSnapshot(`
      .c0 {
        background: #fcecea;
      }

      .c1 {
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

      .c2 {
        border-radius: 4px 4px 0 0;
        width: 100%;
        height: 100%;
      }

      .c2 svg path {
        fill: #d02b20;
      }

      <div
        class="c0 c1 c2"
      >
        <svg
          aria-label="Something went wrong"
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
      </div>
    `);
  });

  it('cancel the upload when pressing cancel', () => {
    const onCancelSpy = jest.fn();

    renderCompo({ onCancel: onCancelSpy });

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancelSpy).toHaveBeenCalled();
  });
});
