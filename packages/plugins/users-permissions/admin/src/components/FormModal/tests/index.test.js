/**
 *
 * Tests for FormModal
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import FormModal from '../index';

const messages = {
  en: {},
};

describe('<FormModal />', () => {
  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(
      <IntlProvider locale="en" messages={messages} textComponent="span">
        <FormModal
          layout={{ forms: [], schema: {} }}
          isOpen={false}
          onToggle={jest.fn()}
          headerBreadcrumbs={['Edit', 'Email']}
        />
      </IntlProvider>
    );

    expect(firstChild).toMatchInlineSnapshot(`null`);
  });

  test.todo('It should display an array of inputs');
});
