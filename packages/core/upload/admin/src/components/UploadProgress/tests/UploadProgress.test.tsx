// TODO: find a better naming convention for the file that was an index file before
import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import en from '../../../translations/en.json';
import { UploadProgress, UploadProgressProps } from '../UploadProgress';

type MessageKeys = keyof typeof en;

const enKeys = Object.keys(en) as MessageKeys[];

const messageForPlugin = enKeys.reduce(
  (acc: { [key in MessageKeys]: string }, curr: MessageKeys) => {
    acc[curr] = `upload.${en[curr]}`;
    return acc;
  },
  {} as { [key in MessageKeys]: string }
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const renderCompo = (props: UploadProgressProps) => {
  const target = document.createElement('div');
  document.body.appendChild(target);

  return render(
    <QueryClientProvider client={queryClient}>
      <DesignSystemProvider>
        <IntlProvider locale="en" messages={messageForPlugin} defaultLocale="en">
          <UploadProgress error={undefined} {...props} />
        </IntlProvider>
      </DesignSystemProvider>
    </QueryClientProvider>,
    { container: target }
  );
};

describe('<UploadProgress />', () => {
  it('renders with no error', () => {
    const {
      container: { firstChild },
    } = renderCompo({
      onCancel: jest.fn(),
    });

    expect(firstChild).toMatchInlineSnapshot(`
      .c0 {
        background: #eaeaef;
      }

      .c3 {
        width: 100%;
      }

      .c1 {
        align-items: center;
        flex-direction: row;
        display: flex;
      }

      .c4 {
        gap: 8px;
        align-items: center;
        flex-direction: column;
        display: flex;
      }

      .c9 {
        gap: 8px;
        align-items: center;
        flex-direction: row;
        display: flex;
      }

      .c7 {
        font-size: 1.4rem;
        line-height: 1.43;
        color: currentcolor;
      }

      .c10 {
        font-size: 1.2rem;
        line-height: 1.33;
        color: inherit;
      }

      .c5 {
        position: relative;
        overflow: hidden;
        width: 10.2rem;
        height: 0.8rem;
        background-color: #666687;
        border-radius: 4px;
        transform: translateZ(0);
      }

      .c6 {
        background-color: #ffffff;
        border-radius: 4px;
        width: 100%;
        height: 100%;
      }

      .c2 {
        border-radius: 4px 4px 0 0;
        width: 100%;
        height: 100%;
      }

      .c8 {
        border: none;
        background: none;
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

      @media (prefers-reduced-motion: no-preference) {
        .c6 {
          transition: transform 320ms cubic-bezier(.4,0,.2,1);
        }
      }

      <div
        class="c0 c1 c2"
      >
        <div
          class="c3 c4"
        >
          <div
            aria-valuemax="100"
            aria-valuemin="0"
            class="c5"
            data-max="100"
            data-state="indeterminate"
            role="progressbar"
          >
            <div
              class="c6"
              data-max="100"
              data-state="indeterminate"
              style="transform: translate3D(-100%, 0, 0);"
            />
          </div>
          <span
            class="c7"
          >
            0/100%
          </span>
          <button
            class="c8"
            type="button"
          >
            <div
              class="c9"
            >
              <span
                class="c10"
              >
                Cancel
              </span>
              <svg
                aria-hidden="true"
                fill="currentColor"
                height="16"
                viewBox="0 0 32 32"
                width="16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M26.061 23.939a1.503 1.503 0 0 1-2.125 2.125L16 18.125l-7.939 7.936a1.503 1.503 0 1 1-2.125-2.125L13.875 16 5.939 8.061a1.503 1.503 0 1 1 2.125-2.125L16 13.875l7.939-7.94a1.502 1.502 0 1 1 2.125 2.125L18.125 16z"
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
    } = renderCompo({ error: new Error('Something went wrong'), onCancel: jest.fn() });

    expect(firstChild).toMatchInlineSnapshot(`
      .c0 {
        background: #fcecea;
      }

      .c1 {
        align-items: center;
        flex-direction: row;
        display: flex;
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
        error="Error: Something went wrong"
      >
        <svg
          aria-label="Something went wrong"
          fill="currentColor"
          height="16"
          viewBox="0 0 32 32"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M26.061 23.939a1.503 1.503 0 0 1-2.125 2.125L16 18.125l-7.939 7.936a1.503 1.503 0 1 1-2.125-2.125L13.875 16 5.939 8.061a1.503 1.503 0 1 1 2.125-2.125L16 13.875l7.939-7.94a1.502 1.502 0 1 1 2.125 2.125L18.125 16z"
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
