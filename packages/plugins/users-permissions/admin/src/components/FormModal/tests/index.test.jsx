/**
 *
 * Tests for FormModal
 *
 */

import * as React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import FormModal from '../index';

const messages = {};

const makeApp = (layout = { forms: [], schema: {} }, isOpen = false) => {
  return (
    <IntlProvider locale="en" messages={messages} textComponent="span">
      <DesignSystemProvider>
        <FormModal
          layout={layout}
          isOpen={isOpen}
          onToggle={jest.fn()}
          headerBreadcrumbs={['Edit', 'Email']}
          onSubmit={jest.fn()}
          isSubmiting={false}
          initialData={{}}
          providerToEditName="test"
        />
      </DesignSystemProvider>
    </IntlProvider>
  );
};

describe('<FormModal />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(makeApp());

    expect(firstChild).toMatchInlineSnapshot(`
      .c0 {
        border: 0;
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        width: 1px;
      }

      <span
        class="c0"
      >
        <p
          aria-live="polite"
          aria-relevant="all"
          id="live-region-log"
          role="log"
        />
        <p
          aria-live="polite"
          aria-relevant="all"
          id="live-region-status"
          role="status"
        />
        <p
          aria-live="assertive"
          aria-relevant="all"
          id="live-region-alert"
          role="alert"
        />
      </span>
    `);
  });

  it('It should display an array of inputs', () => {
    const { getByLabelText } = render(
      makeApp(
        {
          form: [
            [
              {
                intlLabel: { id: 'enabled', defaultMessage: 'Enabled' },
                name: 'enabled',
                type: 'text',
                description: { id: 'test', defaultMessage: 'test' },
                size: 6,
              },
            ],
          ],
          schema: {},
        },
        true
      )
    );

    expect(getByLabelText('Enabled')).toBeInTheDocument();
  });
});
