import { Form } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen } from '@tests/utils';
import { IntlProvider } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { ComponentProvider } from '../../ComponentContext';
import { RepeatableComponent, RepeatableComponentProps } from '../Repeatable';

const FIELD_NAME = 'repeatableComponent';

jest.mock('../../../InputRenderer', () => ({
  InputRenderer: () => 'INPUTS',
}));

const useDocMock = jest.fn();
const useDocumentMock = jest.fn();

jest.mock('../../../../../../hooks/useDocument', () => ({
  useDoc: (...args: unknown[]) => useDocMock(...args),
  useDocument: (...args: unknown[]) => useDocumentMock(...args),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useIsDesktop: jest.fn().mockReturnValue(true),
}));

describe('RepeatableComponent', () => {
  beforeEach(() => {
    useDocMock.mockReturnValue({
      collectionType: 'collection-types',
      model: 'api::address.address',
      id: 'create',
    });

    useDocumentMock.mockReturnValue({
      isLoading: false,
      components: {
        'blog.test-como': {
          category: 'blog',
          info: { displayName: 'test comp' },
          attributes: {
            name: { type: 'string', default: 'toto' },
          },
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    attribute: {
      type: 'component',
      component: 'blog.test-como',
      repeatable: true,
    },
    disabled: false,
    layout: [
      [
        {
          attribute: { type: 'string' },
          name: 'name',
          label: 'name',
          type: 'string',
          size: 12,
        },
      ],
    ],
    mainField: { name: 'name', type: 'string' },
    name: FIELD_NAME,
    type: 'component',
    children: () => 'INPUTS',
  } satisfies RepeatableComponentProps;

  const render = (
    initialFormValues: Record<string, unknown>,
    props: Partial<RepeatableComponentProps> = {},
    messages: Record<string, string> = {}
  ) =>
    renderRTL(
      <ComponentProvider level={0} type="component">
        <RepeatableComponent {...defaultProps} {...props} />
      </ComponentProvider>,
      {
        renderOptions: {
          wrapper: ({ children }) => (
            <Routes>
              <Route
                path="/content-manager/:collectionType/:slug/:id"
                element={
                  <Form initialValues={initialFormValues} method="POST" onSubmit={jest.fn()}>
                    <IntlProvider locale="en" textComponent="span" messages={messages}>
                      {children}
                    </IntlProvider>
                  </Form>
                }
              />
            </Routes>
          ),
        },
        initialEntries: ['/content-manager/collection-types/api::address.address/create'],
      }
    );

  it('renders the empty initializer when the field value is null', () => {
    render({ [FIELD_NAME]: null });

    expect(screen.getByRole('button', { name: /No entry yet/i })).toBeInTheDocument();
  });

  it('renders the empty initializer when the field value is undefined', () => {
    render({});

    expect(screen.getByRole('button', { name: /No entry yet/i })).toBeInTheDocument();
  });

  it('renders repeatable entries when the field value is an array', () => {
    render({
      [FIELD_NAME]: [
        {
          __temp_key__: '0',
          name: 'Entry one',
        },
      ],
    });

    expect(screen.getByRole('button', { name: 'Entry one' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add an entry/i })).toBeInTheDocument();
  });

  it('translates an enumeration entry title using the value as the message id', () => {
    render(
      { [FIELD_NAME]: [{ __temp_key__: '0', name: 'md' }] },
      { mainField: { name: 'name', type: 'enumeration' } },
      { md: 'Medium' }
    );

    expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'md' })).not.toBeInTheDocument();
  });

  it('falls back to the raw enumeration value when no translation is registered', () => {
    render(
      { [FIELD_NAME]: [{ __temp_key__: '0', name: 'md' }] },
      { mainField: { name: 'name', type: 'enumeration' } }
    );

    expect(screen.getByRole('button', { name: 'md' })).toBeInTheDocument();
  });
});
