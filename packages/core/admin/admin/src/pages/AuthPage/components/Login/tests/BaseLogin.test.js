import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@strapi/parts/ThemeProvider';
import { lightTheme } from '@strapi/parts/themes';
import { Router } from 'react-router-dom';
import * as yup from 'yup';
import { createMemoryHistory } from 'history';
import BaseLogin from '../BaseLogin';

jest.mock('react-intl', () => {
  const reactIntl = jest.requireActual('react-intl');
  const intl = reactIntl.createIntl({
    locale: 'en',
  });

  return {
    ...reactIntl,
    useIntl: () => intl,
  };
});
jest.mock('@strapi/helper-plugin', () => ({
  useQuery: () => ({
    get: () => '',
  }),
  Form: () => <form />,
}));

describe('ADMIN | PAGES | AUTH | BaseLogin', () => {
  it('should render and match the snapshot', () => {
    const history = createMemoryHistory();
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <Router history={history}>
          <BaseLogin onSubmit={() => {}} schema={yup.object()} />
        </Router>
      </ThemeProvider>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c6 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #4945ff;
      }

      .c9 {
        font-weight: 400;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c7 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c8 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c1 {
        background: #ffffff;
        padding-top: 48px;
        padding-right: 56px;
        padding-bottom: 48px;
        padding-left: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c4 {
        padding-top: 16px;
      }

      .c3 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c5 {
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

      .c5 svg path {
        fill: #4945ff;
      }

      .c5 svg {
        font-size: 0.625rem;
      }

      .c0 {
        outline: none;
      }

      .c2 {
        margin: 0 auto;
        width: 552px;
      }

      <main
        aria-labelledby="welcome"
        class="c0"
        id="main-content"
        tabindex="-1"
      >
        <div
          class="c1 c2"
        >
          <form />
        </div>
        <div
          class="c3"
        >
          <div
            class="c4"
          >
            <a
              class="c5"
              href="/auth/forgot-password"
            >
              <span
                class="c6 c7 c8"
              >
                <span
                  class="c9"
                >
                  Forgot your password?
                </span>
              </span>
            </a>
          </div>
        </div>
      </main>
    `);
  });
});
