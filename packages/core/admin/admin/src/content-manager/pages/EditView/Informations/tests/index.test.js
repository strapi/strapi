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

      .c6 {
        font-weight: 600;
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c7 {
        color: #32324d;
        font-size: 0.875rem;
        line-height: 1.43;
      }

      .c5 {
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
          class="c4"
        >
          <div
            class="c5"
          >
            <span
              class="c6"
            >
              Created
            </span>
            <span
              class="c7"
            >
              now
            </span>
          </div>
          <div
            class="c5"
          >
            <span
              class="c6"
            >
              By
            </span>
            <span
              class="c7"
            >
              -
            </span>
          </div>
          <div
            class="c5"
          >
            <span
              class="c6"
            >
              Last update
            </span>
            <span
              class="c7"
            >
              now
            </span>
          </div>
          <div
            class="c5"
          >
            <span
              class="c6"
            >
              By
            </span>
            <span
              class="c7"
            >
              -
            </span>
          </div>
        </div>
      </div>
    `);
  });
});
