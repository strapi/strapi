import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import Onboarding from '../index';

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

      .c1 svg path {
        fill: #ffffff;
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
            fill="none"
            height="1em"
            viewBox="0 0 15 14"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.08 4.1c0-1.19 1.18-2.17 2.42-2.17s2.43.98 2.43 2.17c0 1.1-.56 1.61-1.31 2.28l-.03.03c-.75.65-1.66 1.47-1.66 3.09a.57.57 0 101.15 0c0-1.08.55-1.6 1.3-2.26l.02-.02c.75-.66 1.67-1.48 1.67-3.12C11.07 2.13 9.22.78 7.5.78 5.78.78 3.93 2.13 3.93 4.1a.57.57 0 101.15 0zm2.42 9.26a.88.88 0 100-1.75.88.88 0 000 1.75z"
              fill="#212134"
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
