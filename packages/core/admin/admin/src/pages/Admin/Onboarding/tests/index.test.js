import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faFile, faBook } from '@fortawesome/free-solid-svg-icons';
import Onboarding from '../index';

library.add(faBook, faFile);

jest.mock('../../../../hooks', () => ({
  useConfigurations: jest.fn(() => {
    return { showTutorials: true };
  }),
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
      <Onboarding />
    </IntlProvider>
  </ThemeProvider>
);

describe('Onboarding', () => {
  it('renders and matches the snapshot', async () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c0 {
        position: fixed;
        bottom: 8px;
        right: 8px;
      }

      .c1 {
        width: 40px;
        height: 40px;
        background: #4945ff;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
        border-radius: 50%;
      }

      .c1 svg {
        color: #ffffff;
      }

      <aside
        class="c0"
      >
        <button
          aria-label="Help button"
          class="c1"
          id="onboarding"
        >
          <svg
            aria-hidden="true"
            class="svg-inline--fa fa-question "
            data-icon="question"
            data-prefix="fas"
            focusable="false"
            role="img"
            viewBox="0 0 384 512"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M202.021 0C122.202 0 70.503 32.703 29.914 91.026c-7.363 10.58-5.093 25.086 5.178 32.874l43.138 32.709c10.373 7.865 25.132 6.026 33.253-4.148 25.049-31.381 43.63-49.449 82.757-49.449 30.764 0 68.816 19.799 68.816 49.631 0 22.552-18.617 34.134-48.993 51.164-35.423 19.86-82.299 44.576-82.299 106.405V320c0 13.255 10.745 24 24 24h72.471c13.255 0 24-10.745 24-24v-5.773c0-42.86 125.268-44.645 125.268-160.627C377.504 66.256 286.902 0 202.021 0zM192 373.459c-38.196 0-69.271 31.075-69.271 69.271 0 38.195 31.075 69.27 69.271 69.27s69.271-31.075 69.271-69.271-31.075-69.27-69.271-69.27z"
              fill="currentColor"
            />
          </svg>
        </button>
      </aside>
    `);
  });

  it('should open links when button is clicked', () => {
    render(App);

    fireEvent.click(document.querySelector('#onboarding'));
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });
});
