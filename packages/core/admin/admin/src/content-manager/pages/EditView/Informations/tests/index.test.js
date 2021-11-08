/**
 *
 * Tests for Informations
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import Theme from '../../../../../components/Theme';
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
      <Theme>
        <Informations />
      </Theme>
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

  it('renders and matches the snaphsot', () => {
    useCMEditViewDataManager.mockImplementationOnce(() => ({
      initialData: {},
      isCreatingEntry: true,
    }));

    const {
      container: { firstChild },
    } = render(makeApp());

    expect(firstChild).toMatchInlineSnapshot(`
      .c2 {
        padding-top: 8px;
        padding-bottom: 24px;
      }

      .c3 {
        background: #eaeaef;
      }

      .c4 {
        height: 1px;
        border: none;
        margin: 0;
      }

      .c0 {
        color: #666687;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c7 {
        font-weight: 500;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c8 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c1 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c6 {
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
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
      }

      .c5 {
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
          class="c0 c1"
        >
          Information
        </span>
        <div
          class="c2"
        >
          <hr
            class="c3 c4"
          />
        </div>
        <div
          class="c5"
        >
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
