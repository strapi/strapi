import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@strapi/parts/ThemeProvider';
import { lightTheme } from '@strapi/parts/themes';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import * as yup from 'yup';
import Register from '..';

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
jest.mock('../../../../../components/LocalesProvider/useLocalesProvider', () => () => ({
  changeLocale: () => {},
  localeNames: ['en'],
  messages: ['test'],
}));
jest.mock('@strapi/helper-plugin', () => ({
  useNotification: () => jest.fn({}),
  useQuery: () => ({
    get: () => '',
  }),
  Form: () => <form />,
}));

describe('ADMIN | PAGES | AUTH | Register', () => {
  it('should render and match the snapshot', () => {
    const history = createMemoryHistory();
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <Router history={history}>
          <Register fieldsToDisable={[]} noSignin onSubmit={() => {}} schema={yup.object()} />
        </Router>
      </ThemeProvider>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      .c4 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c5 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c1 {
        padding-top: 24px;
        padding-right: 40px;
      }

      .c3 {
        padding-right: 4px;
      }

      .c6 {
        padding-top: 64px;
        padding-bottom: 64px;
      }

      .c7 {
        background: #ffffff;
        padding-top: 48px;
        padding-right: 56px;
        padding-bottom: 48px;
        padding-left: 56px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c0 {
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

      .c2 {
        border: none;
        background: transparent;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        font-size: 0.75rem;
      }

      .c2 svg {
        height: 0.25rem;
      }

      .c2 svg path {
        fill: #8e8ea9;
      }

      .c8 {
        margin: 0 auto;
        width: 552px;
      }

      <div>
        <header
          class="c0"
        >
          <div
            class="c1"
          >
            <div>
              <button
                aria-controls="simplemenu-1"
                aria-expanded="false"
                aria-haspopup="true"
                class="c2"
                type="button"
              >
                <div
                  class="c3"
                >
                  <span
                    class="c4 c5"
                  />
                </div>
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="1em"
                  viewBox="0 0 14 8"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clip-rule="evenodd"
                    d="M14 .889a.86.86 0 01-.26.625L7.615 7.736A.834.834 0 017 8a.834.834 0 01-.615-.264L.26 1.514A.861.861 0 010 .889c0-.24.087-.45.26-.625A.834.834 0 01.875 0h12.25c.237 0 .442.088.615.264a.86.86 0 01.26.625z"
                    fill="#32324D"
                    fill-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <div
          class="c6"
        >
          <div
            class="c7 c8"
          >
            <form />
          </div>
        </div>
      </div>
    `);
  });
});
