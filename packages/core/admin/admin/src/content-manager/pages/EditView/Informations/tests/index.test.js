/**
 *
 * Tests for Informations
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useContentManagerEditViewDataManager } from '@strapi/helper-plugin';
import Theme from '../../../../../components/Theme';
import Informations from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  useContentManagerEditViewDataManager: jest.fn(),
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
    useContentManagerEditViewDataManager.mockImplementationOnce(() => ({
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
        font-weight: 500;
        font-size: 0.75rem;
        line-height: 1.33;
        color: #666687;
      }

      .c6 {
        font-weight: 500;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
      }

      .c7 {
        font-weight: 400;
        font-size: 0.875rem;
        line-height: 1.43;
        color: #32324d;
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
          style="text-transform: uppercase;"
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
              content-manager.containers.Edit.information.lastUpdate
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
              content-manager.containers.Edit.information.by
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
