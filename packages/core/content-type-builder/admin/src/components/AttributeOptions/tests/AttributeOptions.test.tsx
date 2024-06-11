import { useStrapiApp } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { FormModalNavigationProvider } from '../../FormModalNavigationProvider/FormModalNavigationProvider';
import { AttributeOptions } from '../AttributeOptions';

import type { IconByType } from '../../AttributeIcon';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useStrapiApp: jest.fn((_name, getter) =>
    getter({
      customFields: {
        get: jest.fn().mockReturnValueOnce({
          name: 'color',
          pluginId: 'mycustomfields',
          type: 'text',
          icon: jest.fn(),
          intlLabel: {
            id: 'mycustomfields.color.label',
            defaultMessage: 'Color',
          },
          intlDescription: {
            id: 'mycustomfields.color.description',
            defaultMessage: 'Select any color',
          },
          components: {
            Input: jest.fn(),
          },
        }),
        getAll: jest.fn(),
      },
    })
  ),
}));

const mockAttributes: IconByType[][] = [
  [
    'text',
    'email',
    'richtext',
    'password',
    'number',
    'enumeration',
    'date',
    'media',
    'boolean',
    'json',
    'relation',
    'uid',
  ],
  ['component', 'dynamiczone'],
];

const makeApp = () => {
  return (
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <DesignSystemProvider>
        <MemoryRouter>
          <FormModalNavigationProvider>
            <AttributeOptions
              attributes={mockAttributes}
              forTarget="contentType"
              kind="collectionType"
            />
          </FormModalNavigationProvider>
        </MemoryRouter>
      </DesignSystemProvider>
    </IntlProvider>
  );
};

describe('<AttributeOptions />', () => {
  it('renders and matches the snapshot', () => {
    const App = makeApp();
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });

  it('shows the simple tabs', () => {
    const App = makeApp();
    render(App);

    const defaultTab = screen.getByRole('tab', { selected: true, name: 'Default' });
    const customTab = screen.getByRole('tab', { selected: false, name: 'Custom' });

    expect(defaultTab).toBeVisible();
    expect(customTab).toBeVisible();
  });

  it('defaults to the default tab', () => {
    const App = makeApp();
    render(App);

    const comingSoonText = screen.queryByText('Nothing in here yet.');

    expect(comingSoonText).not.toBeInTheDocument();
  });

  it('switches to the custom tab without custom fields', async () => {
    const App = makeApp();
    render(App);

    jest.mocked(useStrapiApp).mockImplementation((_name, getter) =>
      // @ts-expect-error - mocking purposes
      getter({
        customFields: {
          customFields: {},
          get: jest.fn(),
          getAll: jest.fn().mockReturnValue({}),
          register: jest.fn(),
        },
      })
    );

    const user = userEvent.setup();

    await user.click(screen.getByRole('tab', { name: 'Custom' }));
    await screen.findByText('Nothing in here yet.');
  });

  it('switches to the custom tab with custom fields', async () => {
    jest.mocked(useStrapiApp).mockImplementation((_name, getter) =>
      // @ts-expect-error - mocking purposes
      getter({
        customFields: {
          customFields: {},
          get: jest.fn(),
          getAll: jest.fn().mockReturnValue({
            'plugin::mycustomfields.test': {
              name: 'color',
              pluginId: 'mycustomfields',
              type: 'text',
              icon: jest.fn(),
              intlLabel: {
                id: 'mycustomfields.color.label',
                defaultMessage: 'Color',
              },
              intlDescription: {
                id: 'mycustomfields.color.description',
                defaultMessage: 'Select any color',
              },
              components: {
                Input: jest.fn(),
              },
            },
          }),
          register: jest.fn(),
        },
      })
    );

    const App = makeApp();
    render(App);

    const user = userEvent.setup();

    await user.click(screen.getByRole('tab', { name: 'Custom' }));
    const customFieldText = screen.getByText('Color');
    const howToAddLink = screen.getByRole('link', { name: 'How to add custom fields' });

    expect(customFieldText).toBeVisible();
    expect(howToAddLink).toBeVisible();
  });
});
