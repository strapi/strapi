import { DesignSystemProvider } from '@strapi/design-system';
import { act, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { SelectTree } from '../SelectTree';

import type { SelectTreeProps } from '../SelectTree';

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

const ComponentFixture = (props: SelectTreeProps) => (
  <IntlProvider locale="en" messages={{}}>
    <DesignSystemProvider>
      <SelectTree defaultValue={{ value: 'f1' }} {...props} />
    </DesignSystemProvider>
  </IntlProvider>
);

const setup = (props?: SelectTreeProps) => {
  return new Promise((resolve) => {
    act(() => {
      resolve(render(<ComponentFixture {...props} options={FIXTURE_OPTIONS} />));
    });
  });
};

describe('SelectTree', () => {
  test('renders', async () => {
    expect(await setup()).toMatchSnapshot();
  });
});
