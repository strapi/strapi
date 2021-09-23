import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import ContentBox from '../index';

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <ContentBox
        title="Code example"
        subtitle="Learn by testing real project developed by the community"
      />
    </IntlProvider>
  </ThemeProvider>
);

describe('ContentBox', () => {
  it('renders and matches the snapshot', async () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      .c0 {
        background: #ffffff;
        padding: 24px;
        border-radius: 4px;
        box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
      }

      .c2 {
        padding: 12px;
        border-radius: 4px;
      }

      .c1 {
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

      .c4 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c4 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c4 > * + * {
        margin-top: 4px;
      }

      .c5 {
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #32324d;
      }

      .c6 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c3 {
        margin-right: 24px;
      }

      .c3 svg {
        width: 2rem;
        height: 2rem;
      }

      <div
        class="c0 c1"
      >
        <div
          class="c2 c1 c3"
        />
        <div
          class="c4"
        >
          <div
            class="c1"
          >
            <span
              class="c5"
            >
              Code example
            </span>
          </div>
          <span
            class="c6"
          >
            Learn by testing real project developed by the community
          </span>
        </div>
      </div>
    `);

    expect(
      screen.getByText('Learn by testing real project developed by the community')
    ).toBeInTheDocument();
  });
});
