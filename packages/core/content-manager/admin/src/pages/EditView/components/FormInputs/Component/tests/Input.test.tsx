import { Form, useField } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { ComponentProvider } from '../../ComponentContext';
import { RelationsInput } from '../../Relations/Relations';
import { CopiedComponentsProvider } from '../CopiedComponents';
import { ComponentInput, type ComponentInputProps } from '../Input';

import type { ComponentCopyModalProps } from '../ComponentCopyModal';

const FIELD_NAME = 'seo';

const useDocMock = jest.fn();
const useDocumentMock = jest.fn();

jest.mock('../../../../../../hooks/useDocument', () => ({
  useDoc: (...args: unknown[]) => useDocMock(...args),
  useDocument: (...args: unknown[]) => useDocumentMock(...args),
}));

/**
 * The copy itself is covered by the modal tests, here it hands the field a ready-made copy.
 */
const mockCopy = {
  title: 'Copied title',
  indexable: true,
  categories: {
    connect: [
      {
        id: 9,
        documentId: 'zeta',
        locale: 'en',
        status: 'published',
        name: 'Relation Z',
        apiData: { id: 9, documentId: 'zeta', locale: 'en' },
        __temp_key__: 'a0',
      },
    ],
    disconnect: [],
  },
};
const mockModalProps = jest.fn();

jest.mock('../ComponentCopyModal', () => ({
  ComponentCopyModal: (props: ComponentCopyModalProps) => {
    mockModalProps(props);

    return (
      <div role="dialog" aria-label="copy modal">
        <button
          type="button"
          onClick={() => {
            props.onInsert([mockCopy]);
            props.onClose();
          }}
        >
          Insert copy
        </button>
      </div>
    );
  },
}));

const relationAttribute = {
  type: 'relation',
  relation: 'oneToMany',
  target: 'api::category.category',
  targetModel: 'api::category.category',
  relationType: 'oneToMany',
} as const;

const components = {
  'shared.seo': {
    uid: 'shared.seo',
    category: 'shared',
    info: { displayName: 'SEO' },
    attributes: {
      title: { type: 'string' },
      indexable: { type: 'boolean', default: false },
      categories: relationAttribute,
    },
  },
};

/**
 * Shows the value of a scalar field, the relations field is the real one.
 */
const ValueProbe = ({ name }: { name: string }) => {
  const field = useField(name);

  return <output>{`${name}: ${String(field.value ?? '')}`}</output>;
};

describe('ComponentInput', () => {
  beforeEach(() => {
    useDocMock.mockReturnValue({
      collectionType: 'collection-types',
      model: 'api::article.article',
      id: 'article-1',
    });

    useDocumentMock.mockReturnValue({
      isLoading: false,
      components,
      document: { documentId: 'article-1', id: 1 },
      schema: {
        uid: 'api::article.article',
        attributes: {
          [FIELD_NAME]: { type: 'component', component: 'shared.seo', repeatable: false },
        },
      },
      // the relations input mounts the relation modal, which reads these
      getInitialFormValues: jest.fn(() => ({})),
      getTitle: jest.fn(() => 'Article'),
      validate: jest.fn(() => null),
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    attribute: { type: 'component', component: 'shared.seo', repeatable: false },
    label: 'seo',
    name: FIELD_NAME,
    type: 'component',
    layout: [
      [
        { name: 'title', label: 'title', type: 'string', size: 6, attribute: { type: 'string' } },
        {
          name: 'categories',
          label: 'categories',
          type: 'relation',
          size: 6,
          attribute: relationAttribute,
          mainField: { name: 'name', type: 'string' },
        },
      ],
    ],
    children: (props) =>
      props.type === 'relation' ? <RelationsInput {...props} /> : <ValueProbe name={props.name} />,
  } satisfies ComponentInputProps;

  const render = (initialFormValues: Record<string, unknown>) =>
    renderRTL(
      <ComponentProvider level={0} type="component">
        <ComponentInput {...defaultProps} />
      </ComponentProvider>,
      {
        renderOptions: {
          wrapper: ({ children }) => (
            <Routes>
              <Route
                path="/content-manager/:collectionType/:slug/:id"
                element={
                  <Form initialValues={initialFormValues} method="PUT" onSubmit={jest.fn()}>
                    <CopiedComponentsProvider>{children}</CopiedComponentsProvider>
                  </Form>
                }
              />
            </Routes>
          ),
        },
        initialEntries: ['/content-manager/collection-types/api::article.article/article-1'],
      }
    );

  it('should offer to start empty or to copy existing content when the field is empty', async () => {
    const { user } = render({ [FIELD_NAME]: null });

    await user.click(screen.getByRole('button', { name: /No entry yet/ }));
    await user.click(screen.getByRole('menuitem', { name: /Use existing content/ }));

    expect(screen.getByRole('dialog', { name: 'copy modal' })).toBeInTheDocument();
    expect(mockModalProps).toHaveBeenCalledWith(
      expect.objectContaining({ replacesContent: false, selection: 'single' })
    );

    await user.click(screen.getByRole('button', { name: 'Insert copy' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('seo.title: Copied title')).toBeInTheDocument();
    expect(await screen.findByText('Relation Z')).toBeInTheDocument();
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  it('should drop the flag of the copy when the field is reset', async () => {
    const { user } = render({ [FIELD_NAME]: null });

    await user.click(screen.getByRole('button', { name: /No entry yet/ }));
    await user.click(screen.getByRole('menuitem', { name: /Use existing content/ }));
    await user.click(screen.getByRole('button', { name: 'Insert copy' }));

    expect(screen.getByText('Copied')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset Entry' }));

    expect(screen.queryByText('Copied')).not.toBeInTheDocument();

    // an empty component added in its place isn't a copy
    await user.click(screen.getByRole('button', { name: /No entry yet/ }));
    await user.click(screen.getByRole('menuitem', { name: /Empty entry/ }));

    expect(screen.getByRole('button', { name: 'Use existing content…' })).toBeInTheDocument();
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
  });

  it('should offer to use existing content while the component only holds its defaults', () => {
    // what the component holds right after "Empty entry"
    render({ [FIELD_NAME]: { title: null, indexable: false } });

    expect(screen.getByRole('button', { name: 'Use existing content…' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Replace content…' })).not.toBeInTheDocument();
  });

  it('should offer to replace the content once the component holds some', async () => {
    const { user } = render({ [FIELD_NAME]: { title: 'Hello' } });

    expect(screen.queryByRole('button', { name: 'Use existing content…' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Replace content…' }));

    expect(mockModalProps).toHaveBeenCalledWith(expect.objectContaining({ replacesContent: true }));
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Insert copy' }));

    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  it('should only show the relations of the copy once the content is replaced', async () => {
    const { user } = render({
      [FIELD_NAME]: { id: 5, title: 'Old title', indexable: true, categories: { count: 3 } },
    });

    // the relations of the saved component are loaded
    expect(await screen.findByText('Relation entity 1')).toBeInTheDocument();
    expect(screen.getByText('Relation entity 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Replace content…' }));
    await user.click(screen.getByRole('button', { name: 'Insert copy' }));

    expect(screen.getByText('seo.title: Copied title')).toBeInTheDocument();
    expect(await screen.findByText('Relation Z')).toBeInTheDocument();
    expect(screen.queryByText('Relation entity 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Relation entity 3')).not.toBeInTheDocument();
    expect(screen.getByText('categories (1)')).toBeInTheDocument();
  });
});
