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

const renderCompo = props => {
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
      .c6 {
        color: #dcdce4;
        font-size: 0.75rem;
        line-height: 1.33;
      }

      .c3 {
        padding-bottom: 8px;
      }

      .c7 {
        padding-left: 8px;
      }

      .c0 {
        background: #4a4a6a;
        border-radius: 4px;
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c4 {
        background: #666687;
        border-radius: 4px;
        position: relative;
        width: 78px;
        height: 4px;
      }

      .c4:before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: 4px;
        width: 0%;
        background: #eaeaef;
      }

      .c2 {
        width: 100%;
        height: 100%;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c5 {
        border: none;
        background: none;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c5 svg {
        height: 10px;
        width: 10px;
      }

      .c5 svg path {
        fill: #dcdce4;
      }

      <div
        class="c0 c1 c2"
      >
        <div
          class="c3"
        >
          <div
            aria-label="0/100%"
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow="0"
            class="c4"
            role="progressbar"
            value="0"
          />
        </div>
        <button
          class="c5"
          type="button"
        >
          <span
            class="c6"
          >
            Cancel
          </span>
          <span
            aria-hidden="true"
            class="c7"
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
          </span>
        </button>
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
        border-radius: 4px;
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
        -webkit-box-pack: center;
        -webkit-justify-content: center;
        -ms-flex-pack: center;
        justify-content: center;
      }

      .c2 {
        width: 100%;
        height: 100%;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
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
