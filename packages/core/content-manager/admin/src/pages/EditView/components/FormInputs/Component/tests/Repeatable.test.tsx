import { Form } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen } from '@tests/utils';
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
    initialErrors?: Record<string, unknown>
  ) =>
    renderRTL(
      <ComponentProvider level={0} type="component">
        <RepeatableComponent {...defaultProps} />
      </ComponentProvider>,
      {
        renderOptions: {
          wrapper: ({ children }) => (
            <Routes>
              <Route
                path="/content-manager/:collectionType/:slug/:id"
                element={
                  <Form
                    initialValues={initialFormValues}
                    initialErrors={initialErrors}
                    method="POST"
                    onSubmit={jest.fn()}
                  >
                    {children}
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

  it('opens an item that has an error, not the first item, when several items have errors', async () => {
    render(
      {
        [FIELD_NAME]: [
          { __temp_key__: 'a0', name: 'Entry one' },
          { __temp_key__: 'a1', name: 'Entry two' },
          { __temp_key__: 'a2', name: 'Entry three' },
        ],
      },
      {
        // Mirrors what `setIn` produces for errors on items 2 and 3: the
        // array clone fills the first slot with `undefined`.
        [FIELD_NAME]: [undefined, { name: 'Invalid' }, { name: 'Invalid' }],
      }
    );

    expect(await screen.findByRole('button', { name: 'Entry two' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Entry one' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
