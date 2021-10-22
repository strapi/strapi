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
      .c3 {
        padding-top: 8px;
        padding-bottom: 24px;
      }

      .c4 {
        background: #eaeaef;
      }

      .c5 {
        height: 1px;
        border: none;
        margin: 0;
      }

      .c0 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #666687;
      }

      .c8 {
        font-weight: 500;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c9 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c1 {
        font-weight: 600;
        line-height: 1.14;
      }

      .c2 {
        font-weight: 600;
        font-size: 0.6875rem;
        line-height: 1.45;
        text-transform: uppercase;
      }

      .c7 {
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

      .c6 {
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-flex-direction: column;
        -ms-flex-direction: column;
        flex-direction: column;
      }

      .c6 > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .c6 > * + * {
        margin-top: 16px;
      }

      <div
        class=""
      >
        <span
          class="c0 c1 c2"
        >
          Information
        </span>
        <div
          class="c3"
        >
          <hr
            class="c4 c5"
          />
        </div>
        <div
          class="c6"
        >
          <div
            class="c7"
          >
            <span
              class="c8"
            >
              Last update
            </span>
            <span
              class="c9"
            >
              now
            </span>
          </div>
          <div
            class="c7"
          >
            <span
              class="c8"
            >
              By
            </span>
            <span
              class="c9"
            >
              -
            </span>
          </div>
        </div>
      </div>
    `);
  });
});
