/**
 *
 * Tests for Informations
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../components/ThemeToggleProvider';
import Informations from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  useCMEditViewDataManager: jest.fn(),
}));

const makeApp = () => {
  return (
    <IntlProvider
      locale="en"
      defaultLocale="en"
      messages={{ 'containers.Edit.information': 'Information' }}
    >
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <Informations />
        </Theme>
      </ThemeToggleProvider>
    </IntlProvider>
  );
};

describe('CONTENT MANAGER | EditView | Header', () => {
  const RealNow = Date.now;

  beforeAll(() => {
    global.Date.now = jest.fn(() => new Date('2021-09-20').getTime());
  });

  afterAll(() => {
    global.Date.now = RealNow;
  });

  it('renders and matches the snapshot', () => {
    useCMEditViewDataManager.mockImplementationOnce(() => ({
      initialData: {},
      isCreatingEntry: true,
    }));

    const {
      container: { firstChild },
    } = render(makeApp());

    expect(firstChild).toMatchInlineSnapshot(`
      .c1 {
        padding-top: 8px;
        padding-bottom: 24px;
      }

      .c2 {
        background: #eaeaef;
      }

      .c3 {
        height: 1px;
        border: none;
        margin: 0;
      }

      .c0 {
        color: #666687;
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c7 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c8 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c6 {
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
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
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
      }

      .c5 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c5 > * + * {
        margin-top: 16px;
      }

      <div
        class=""
      >
        <span
          class="c0"
          id="additional-informations"
        >
          Information
        </span>
        <div
          class="c1"
        >
          <hr
            class="c2 c3"
          />
        </div>
        <div
          class="c4 c5"
          spacing="4"
        >
          <div
            class="c6"
          >
            <span
              class="c7"
            >
              Created
            </span>
            <span
              class="c8"
            >
              now
            </span>
          </div>
          <div
            class="c6"
          >
            <span
              class="c7"
            >
              By
            </span>
            <span
              class="c8"
            >
              -
            </span>
          </div>
          <div
            class="c6"
          >
            <span
              class="c7"
            >
              Last update
            </span>
            <span
              class="c8"
            >
              now
            </span>
          </div>
          <div
            class="c6"
          >
            <span
              class="c7"
            >
              By
            </span>
            <span
              class="c8"
            >
              -
            </span>
          </div>
        </div>
      </div>
    `);
  });
});
