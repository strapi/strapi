import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import { PublicationState } from '..';

const ComponentFixture = (props) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}}>
      <PublicationState {...props} />
    </IntlProvider>
  </ThemeProvider>
);

const setup = (props) => render(<ComponentFixture {...props} />);

describe('DynamicTable | PublicationState', () => {
  test('render draft state', () => {
    const { getByText } = setup({ isPublished: false });

    expect(getByText('Draft')).toBeInTheDocument();
  });

  test('render published state', () => {
    const { getByText } = setup({ isPublished: true });

    expect(getByText('Published')).toBeInTheDocument();
  });
});
