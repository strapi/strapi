import { Form } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { ComponentProvider } from '../../ComponentContext';
import { CopiedComponentsProvider } from '../CopiedComponents';
import { RepeatableComponent, RepeatableComponentProps } from '../Repeatable';

import type { ComponentCopyModalProps } from '../ComponentCopyModal';

const FIELD_NAME = 'repeatableComponent';

jest.mock('../../../InputRenderer', () => ({
  InputRenderer: () => 'INPUTS',
}));

/**
 * The copy itself is covered by the modal tests, here the modal hands the field ready-made copies
 * and reports what the field tells it.
 */
const mockModalProps = jest.fn();
const mockInsertResult = jest.fn();

jest.mock('../ComponentCopyModal', () => ({
  ComponentCopyModal: (props: ComponentCopyModalProps) => {
    mockModalProps(props);

    return (
      <div role="dialog" aria-label="copy modal">
        {[1, 2].map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => {
              mockInsertResult(
                props.onInsert(
                  Array.from({ length: count }, (_, index) => ({ name: `Copy ${index + 1}` }))
                )
              );
              props.onClose();
            }}
          >
            {`Insert ${count}`}
          </button>
        ))}
      </div>
    );
  },
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
    label: 'repeatable',
    mainField: { name: 'name', type: 'string' },
    name: FIELD_NAME,
    type: 'component',
    children: () => 'INPUTS',
  } satisfies RepeatableComponentProps;

  const render = (
    initialFormValues: Record<string, unknown>,
    props: Partial<RepeatableComponentProps> = {}
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
                    <CopiedComponentsProvider>{children}</CopiedComponentsProvider>
                  </Form>
                }
              />
            </Routes>
          ),
        },
        initialEntries: ['/content-manager/collection-types/api::address.address/create'],
      }
    );

  const getCopiedBadges = () => screen.queryAllByText('Copied');

  it('renders the empty initializer when the field value is null', () => {
    render({ [FIELD_NAME]: null });

    expect(screen.getByRole('button', { name: /No entry yet/i })).toBeInTheDocument();
  });

  it('offers to add an empty entry or to copy existing content from the empty initializer', async () => {
    const { user } = render({ [FIELD_NAME]: [] });

    await user.click(screen.getByRole('button', { name: /No entry yet/i }));

    expect(screen.getByRole('menuitem', { name: /Empty entry/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Use existing content/ })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /Empty entry/ }));

    expect(await screen.findByRole('button', { name: 'toto' })).toBeInTheDocument();
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

  it('offers to add an empty entry or to copy existing content from the add button', async () => {
    const { user } = render({
      [FIELD_NAME]: [
        {
          __temp_key__: 'a0',
          name: 'Entry one',
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: /Add an entry/i }));

    expect(screen.getByRole('menuitem', { name: /Use existing content/ })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /Empty entry/ }));

    expect(await screen.findByRole('button', { name: 'toto' })).toBeInTheDocument();
  });

  describe('copying existing content', () => {
    it('should flag the copied entries until the next copy and not the empty ones', async () => {
      const { user } = render({ [FIELD_NAME]: [{ __temp_key__: 'a0', name: 'Entry one' }] });

      await user.click(screen.getByRole('button', { name: /Add an entry/i }));
      await user.click(screen.getByRole('menuitem', { name: /Use existing content/ }));

      expect(mockModalProps).toHaveBeenCalledWith(
        expect.objectContaining({ maxSelection: Infinity, selection: 'multiple' })
      );

      await user.click(screen.getByRole('button', { name: 'Insert 2' }));

      expect(mockInsertResult).toHaveBeenLastCalledWith(true);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy 2' })).toBeInTheDocument();
      expect(getCopiedBadges()).toHaveLength(2);
      // copied entries stay collapsed
      expect(screen.queryByText('INPUTS')).not.toBeInTheDocument();

      // a second copy keeps the flags of the first one
      await user.click(screen.getByRole('button', { name: /Add an entry/i }));
      await user.click(screen.getByRole('menuitem', { name: /Use existing content/ }));
      await user.click(screen.getByRole('button', { name: 'Insert 1' }));

      expect(getCopiedBadges()).toHaveLength(3);

      // an empty entry is not flagged
      await user.click(screen.getByRole('button', { name: /Add an entry/i }));
      await user.click(screen.getByRole('menuitem', { name: /Empty entry/ }));

      expect(await screen.findByRole('button', { name: 'toto' })).toBeInTheDocument();
      expect(getCopiedBadges()).toHaveLength(3);
    });

    it('should not flag an empty entry taking the place of a deleted copy', async () => {
      const { user } = render({ [FIELD_NAME]: [] });

      await user.click(screen.getByRole('button', { name: /No entry yet/i }));
      await user.click(screen.getByRole('menuitem', { name: /Use existing content/ }));
      await user.click(screen.getByRole('button', { name: 'Insert 2' }));

      expect(getCopiedBadges()).toHaveLength(2);

      // the first copy keeps the form modified: the flags aren't cleared as a whole
      await user.click(screen.getAllByRole('button', { name: 'Delete' })[1]);

      expect(screen.queryByRole('button', { name: 'Copy 2' })).not.toBeInTheDocument();
      expect(getCopiedBadges()).toHaveLength(1);

      // the form hands the new entry the key the copy had
      await user.click(screen.getByRole('button', { name: /Add an entry/i }));
      await user.click(screen.getByRole('menuitem', { name: /Empty entry/ }));

      expect(await screen.findByRole('button', { name: 'toto' })).toBeInTheDocument();
      expect(getCopiedBadges()).toHaveLength(1);
    });

    it('should tell the modal how many entries can still be added and refuse more', async () => {
      const { user } = render(
        { [FIELD_NAME]: [{ __temp_key__: 'a0', name: 'Entry one' }] },
        { attribute: { ...defaultProps.attribute, max: 2 } }
      );

      await user.click(screen.getByRole('button', { name: /Add an entry/i }));
      await user.click(screen.getByRole('menuitem', { name: /Use existing content/ }));

      expect(mockModalProps).toHaveBeenCalledWith(expect.objectContaining({ maxSelection: 1 }));

      // the safety net, should the modal still hand over too many copies
      await user.click(screen.getByRole('button', { name: 'Insert 2' }));

      expect(mockInsertResult).toHaveBeenLastCalledWith(false);
      expect(
        await screen.findByText('You have already reached the maximum number of fields')
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Copy 1' })).not.toBeInTheDocument();
    });

    it('should not open the modal once the field is full', async () => {
      const { user } = render(
        {
          [FIELD_NAME]: [
            { __temp_key__: 'a0', name: 'Entry one' },
            { __temp_key__: 'a1', name: 'Entry two' },
          ],
        },
        { attribute: { ...defaultProps.attribute, max: 2 } }
      );

      await user.click(screen.getByRole('button', { name: /Add an entry/i }));
      await user.click(screen.getByRole('menuitem', { name: /Use existing content/ }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        await screen.findByText('You have already reached the maximum number of fields')
      ).toBeInTheDocument();
    });
  });
});
