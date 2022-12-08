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
            viewBox="0 0 24 24"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm0 4.92a1.56 1.56 0 110 3.12 1.56 1.56 0 010-3.12zm3.84 13.06a.5.5 0 01-.5.5h-6.2a.5.5 0 01-.5-.5v-.92a.5.5 0 01.5-.5h2.14v-5.28H9.86a.5.5 0 01-.5-.5v-.92a.5.5 0 01.5-.5h2.84a.5.5 0 01.5.5v6.7h2.14a.5.5 0 01.5.5v.92z"
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
