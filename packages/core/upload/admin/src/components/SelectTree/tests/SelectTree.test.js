import React from 'react';
import { render, act } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import SelectTree from '../index';

const FIXTURE_OPTIONS = [
  {
    value: 'f-1',
    label: 'Folder 1',
  },

  {
    value: 'f-2',
    label: 'Folder 2',
    children: [
      {
        value: 'f-2-1',
        label: 'Folder 2-1',
      },

      {
        value: 'f-2-2',
        label: 'Folder 2-2',
        children: [
          {
            value: 'f-2-2-1',
            label: 'Folder 2-2-1',
          },
        ],
      },
    ],
  },
];

const ComponentFixture = (props) => (
  <IntlProvider locale="en" messages={{}}>
    <ThemeProvider theme={lightTheme}>
      <SelectTree defaultValue={{ value: 'f1' }} {...props} />
    </ThemeProvider>
  </IntlProvider>
);

const setup = (props) => {
  return new Promise((resolve) => {
    act(() => {
      resolve(render(<ComponentFixture options={FIXTURE_OPTIONS} {...props} />));
    });
  });
};

describe('SelectTree', () => {
  test('renders', async () => {
    expect(await setup()).toMatchSnapshot();
  });
});
