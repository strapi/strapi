import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
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
      .c5 {
        font-size: 0.75rem;
        line-height: 1.33;
        font-weight: 500;
        color: #32324d;
      }

      .c7 {
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

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

      .c4 {
        -webkit-align-items: stretch;
        -webkit-box-align: stretch;
        -ms-flex-align: stretch;
        align-items: stretch;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
        gap: 4px;
      }

      .c3 {
        margin-right: 24px;
      }

      .c3 svg {
        width: 2rem;
        height: 2rem;
      }

      .c6 {
        word-break: break-all;
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
              class="c5 c6"
            >
              Code example
            </span>
          </div>
          <span
            class="c7"
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
