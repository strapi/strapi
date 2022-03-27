import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import RelationSingle from '../index';

const DEFAULT_PROPS_FIXTURE = {
  metadatas: {
    mainField: {
      name: 'name',
      schema: {
        type: 'string',
      },
    },
  },
  value: {
    count: 1,
  },
};

const ComponentFixture = () => {
  return (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <RelationSingle {...DEFAULT_PROPS_FIXTURE} />
      </IntlProvider>
    </ThemeProvider>
  );
};

describe('DynamicTable / Cellcontent / RelationSingle', () => {
  it('renders and matches the snapshot', async () => {
    const { container } = render(<ComponentFixture />);
    expect(container).toMatchSnapshot();
  });
});
