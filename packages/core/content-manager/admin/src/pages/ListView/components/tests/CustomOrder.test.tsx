import { Table } from '@strapi/admin/strapi-admin';
import { act, render as renderRTL, renderHook, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import {
  CustomOrder,
  MoveToBottomAction,
  MoveToTopAction,
  useCustomOrder,
  type CustomOrderState,
} from '../CustomOrder';

import type { DocumentActionComponent } from '../../../../content-manager';
import type { Document } from '../../../../hooks/useDocument';

const rows = [
  { id: 1, documentId: 'a', name: 'Alice' },
  { id: 2, documentId: 'b', name: 'Bob' },
  { id: 3, documentId: 'c', name: 'Chloé' },
] as Document[];

const createState = (overrides: Partial<CustomOrderState> = {}): CustomOrderState => ({
  isAvailable: true,
  isActive: true,
  canReorder: true,
  isMoving: false,
  rows,
  getPosition: (documentId) => rows.findIndex((row) => row.documentId === documentId) + 1,
  moveToIndex: jest.fn(async () => {}),
  moveToPosition: jest.fn(async () => {}),
  ...overrides,
});

interface ActionProps {
  action: DocumentActionComponent;
  documentId: string;
}

/**
 * Row actions are descriptions, rendered here as plain buttons.
 */
const Action = ({ action, documentId }: ActionProps) => {
  const description = action({
    activeTab: null,
    collectionType: 'collection-types',
    documentId,
    model: 'api::member.member',
  });

  if (!description) {
    return null;
  }

  return (
    <button type="button" disabled={description.disabled} onClick={description.onClick}>
      {description.label}
    </button>
  );
};

const render = (state: CustomOrderState) =>
  renderRTL(
    <CustomOrder.Root state={state}>
      <Table.Root
        rows={state.rows}
        headers={[
          { name: 'strapi_position', label: 'order' },
          { name: 'name', label: 'name' },
        ]}
      >
        <Table.Content>
          <Table.Head>
            <Table.HeaderCell name="strapi_position" label="order" />
            <Table.HeaderCell name="name" label="name" />
          </Table.Head>
          <Table.Body>
            {state.rows.map((row, index) => (
              <CustomOrder.Row key={row.id} documentId={row.documentId}>
                <CustomOrder.PositionCell
                  documentId={row.documentId}
                  position={index + 1}
                  total={state.rows.length}
                />
                <Table.Cell>{row.name}</Table.Cell>
              </CustomOrder.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.Root>
      <Action action={MoveToTopAction} documentId="a" />
      <Action action={MoveToTopAction} documentId="c" />
      <Action action={MoveToBottomAction} documentId="b" />
    </CustomOrder.Root>
  );

describe('CustomOrder', () => {
  describe('PositionCell', () => {
    it('shows the position of each entry', async () => {
      render(createState());

      expect(
        await screen.findByRole('button', { name: 'Position 1 of 3, change position' })
      ).toHaveTextContent('1');
      expect(
        screen.getByRole('button', { name: 'Position 3 of 3, change position' })
      ).toHaveTextContent('3');
    });

    it('moves an entry to the position typed in', async () => {
      const state = createState();
      const { user } = render(state);

      await user.click(
        await screen.findByRole('button', { name: 'Position 2 of 3, change position' })
      );

      const input = screen.getByRole('textbox', { name: 'New position, from 1 to 3' });
      expect(input).toHaveValue('2');
      expect(input).toHaveFocus();

      await user.clear(input);
      await user.type(input, '3{Enter}');

      expect(state.moveToPosition).toHaveBeenCalledWith('b', 3);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('leaves the entry in place when the input is left with Escape', async () => {
      const state = createState();
      const { user } = render(state);

      await user.click(
        await screen.findByRole('button', { name: 'Position 2 of 3, change position' })
      );
      await user.type(screen.getByRole('textbox'), '1{Escape}');

      expect(state.moveToPosition).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Position 2 of 3, change position' })
      ).toHaveFocus();
    });

    it('ignores what is not a number', async () => {
      const state = createState();
      const { user } = render(state);

      await user.click(
        await screen.findByRole('button', { name: 'Position 2 of 3, change position' })
      );

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'first{Enter}');

      expect(state.moveToPosition).not.toHaveBeenCalled();
    });

    it('cannot be changed while a move is in progress', async () => {
      render(createState({ isMoving: true }));

      expect(
        await screen.findByRole('button', { name: 'Position 2 of 3, change position' })
      ).toBeDisabled();
    });

    it('only shows the position to users who cannot move entries', async () => {
      render(createState({ canReorder: false }));

      expect(await screen.findByText('Alice')).toBeInTheDocument();
      expect(screen.getByRole('gridcell', { name: '2' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /change position/ })).not.toBeInTheDocument();
    });

    it('hides the positions when the list is sorted on something else', async () => {
      render(createState({ isActive: false, canReorder: false }));

      expect(await screen.findByText('Alice')).toBeInTheDocument();
      expect(screen.queryByRole('gridcell', { name: '2' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /change position/ })).not.toBeInTheDocument();
    });
  });

  describe('row actions', () => {
    it('moves an entry to the top or the bottom of the list', async () => {
      const state = createState();
      const { user } = render(state);

      const [, moveLastToTop] = await screen.findAllByRole('button', { name: 'Move to top' });
      await user.click(moveLastToTop);

      expect(state.moveToPosition).toHaveBeenLastCalledWith('c', 1);

      await user.click(screen.getByRole('button', { name: 'Move to bottom' }));

      const [documentId, position] = jest.mocked(state.moveToPosition).mock.lastCall ?? [];
      expect(documentId).toBe('b');
      expect(position).toBeGreaterThan(rows.length);
    });

    it('cannot move the first entry to the top', async () => {
      render(createState());

      const [moveFirstToTop] = await screen.findAllByRole('button', { name: 'Move to top' });

      expect(moveFirstToTop).toBeDisabled();
    });

    it('is not offered when entries cannot be moved', async () => {
      render(createState({ canReorder: false }));

      expect(await screen.findByText('Alice')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Move to top' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Move to bottom' })).not.toBeInTheDocument();
    });
  });
});

const MODEL = 'api::article.article';

const hookRows = [
  { id: 1, documentId: 'a' },
  { id: 2, documentId: 'b' },
  { id: 3, documentId: 'c' },
] as Document[];

interface Move {
  id: string;
  body: Record<string, unknown>;
  locale: string | null;
}

type Props = Parameters<typeof useCustomOrder>[0];

const setup = (overrides: Partial<Props> = {}) => {
  const moves: Move[] = [];
  const listRequests: URL[] = [];

  server.use(
    http.post(
      '/content-manager/collection-types/:model/:id/actions/move',
      async ({ params, request }) => {
        moves.push({
          id: String(params.id),
          body: (await request.json()) as Record<string, unknown>,
          locale: new URL(request.url).searchParams.get('locale'),
        });

        return HttpResponse.json({ data: { documentId: params.id } });
      }
    ),
    http.get('/content-manager/collection-types/:model', ({ request }) => {
      listRequests.push(new URL(request.url));

      return HttpResponse.json({
        results: [{ id: 26, documentId: 'z' }],
        pagination: { page: 7, pageSize: 1, pageCount: 7, total: 7 },
      });
    })
  );

  const initialProps: Props = {
    model: MODEL,
    isAvailable: true,
    canUpdate: true,
    sort: 'strapi_position:ASC',
    params: { page: '1', pageSize: '3', sort: 'strapi_position:ASC' },
    results: hookRows,
    pagination: { page: 1, pageSize: 3, total: 7 },
    fulfilledTimeStamp: 1,
    ...overrides,
  };

  const hook = renderHook((props: Props) => useCustomOrder(props), { initialProps });

  return { ...hook, initialProps, moves, listRequests };
};

describe('useCustomOrder', () => {
  it('is only active when the list is sorted by the custom order', () => {
    const { result, rerender, initialProps } = setup();

    expect(result.current).toMatchObject({
      isAvailable: true,
      isActive: true,
      canReorder: true,
      isMoving: false,
      rows: hookRows,
    });

    rerender({ ...initialProps, sort: 'name:ASC' });
    expect(result.current).toMatchObject({ isActive: false, canReorder: false });

    rerender({ ...initialProps, sort: 'strapi_position:asc', canUpdate: false });
    expect(result.current).toMatchObject({ isActive: true, canReorder: false });

    rerender({ ...initialProps, isAvailable: false });
    expect(result.current).toMatchObject({
      isAvailable: false,
      isActive: false,
      canReorder: false,
    });
  });

  it('knows the position of the entries of the page in the whole list', () => {
    const { result } = setup({ pagination: { page: 2, pageSize: 3, total: 7 } });

    expect(result.current.getPosition('a')).toBe(4);
    expect(result.current.getPosition('c')).toBe(6);
    expect(result.current.getPosition('nope')).toBeUndefined();
  });

  it('moves an entry down within the page and shows the new order until the list is fetched again', async () => {
    const { result, rerender, initialProps, moves } = setup();

    await act(async () => {
      await result.current.moveToIndex(0, 2);
    });

    expect(moves).toEqual([{ id: 'a', body: { after: 'c' }, locale: null }]);
    expect(result.current.isMoving).toBe(true);
    expect(result.current.rows.map((row) => row.documentId)).toEqual(['b', 'c', 'a']);

    // The list has been fetched again
    rerender({ ...initialProps, fulfilledTimeStamp: 2 });

    expect(result.current.isMoving).toBe(false);
    expect(result.current.rows).toBe(hookRows);
  });

  it('moves an entry up within the page', async () => {
    const { result, moves } = setup();

    await act(async () => {
      await result.current.moveToIndex(2, 0);
    });

    expect(moves).toEqual([{ id: 'c', body: { before: 'a' }, locale: null }]);
    expect(result.current.rows.map((row) => row.documentId)).toEqual(['c', 'a', 'b']);
  });

  it('ignores moves that go nowhere', async () => {
    const { result, moves } = setup();

    await act(async () => {
      await result.current.moveToIndex(1, 1);
      await result.current.moveToIndex(0, 5);
      await result.current.moveToPosition('b', 2);
      await result.current.moveToPosition('nope', 1);
    });

    expect(moves).toEqual([]);
    expect(result.current.isMoving).toBe(false);
  });

  it('moves an entry to a position of the current page', async () => {
    const { result, moves } = setup({ pagination: { page: 2, pageSize: 3, total: 7 } });

    await act(async () => {
      await result.current.moveToPosition('a', 6);
    });

    expect(moves).toEqual([{ id: 'a', body: { after: 'c' }, locale: null }]);
  });

  it('keeps the position within the list', async () => {
    const { result, moves } = setup();

    await act(async () => {
      await result.current.moveToPosition('c', 0);
    });

    expect(moves).toEqual([{ id: 'c', body: { before: 'a' }, locale: null }]);
  });

  it('moves an entry to a position on another page', async () => {
    const { result, moves, listRequests } = setup({
      params: { page: '1', pageSize: '3', sort: 'strapi_position:ASC', locale: 'fr' },
    });

    await act(async () => {
      // Positions past the end are brought back to the last one
      await result.current.moveToPosition('a', 10);
    });

    // The entry sitting at the target position is looked up in the same view
    expect(listRequests[0].searchParams.get('page')).toBe('7');
    expect(listRequests[0].searchParams.get('pageSize')).toBe('1');
    expect(listRequests[0].searchParams.get('sort')).toBe('strapi_position:ASC');
    expect(listRequests[0].searchParams.get('locale')).toBe('fr');

    expect(moves).toEqual([{ id: 'a', body: { after: 'z' }, locale: 'fr' }]);
    expect(await screen.findByText('Entry moved to position 7')).toBeInTheDocument();
  });

  it('moves an entry before the one sitting at a lower position on another page', async () => {
    const { result, moves } = setup({ pagination: { page: 3, pageSize: 3, total: 9 } });

    await act(async () => {
      await result.current.moveToPosition('b', 1);
    });

    expect(moves).toEqual([{ id: 'b', body: { before: 'z' }, locale: null }]);
  });

  it('does nothing when there is no entry at the target position', async () => {
    const { result, moves } = setup();
    server.use(
      http.get('/content-manager/collection-types/:model', () =>
        HttpResponse.json({
          results: [],
          pagination: { page: 7, pageSize: 1, pageCount: 0, total: 0 },
        })
      )
    );

    await act(async () => {
      await result.current.moveToPosition('a', 7);
    });

    expect(moves).toEqual([]);
  });

  it('shows an error when the entry at the target position cannot be fetched', async () => {
    const { result, moves } = setup();
    server.use(
      http.get('/content-manager/collection-types/:model', () =>
        HttpResponse.json(
          {
            error: {
              status: 500,
              name: 'InternalServerError',
              message: 'The entries could not be fetched',
              details: {},
            },
          },
          { status: 500 }
        )
      )
    );

    await act(async () => {
      await result.current.moveToPosition('a', 7);
    });

    expect(await screen.findByText('The entries could not be fetched')).toBeInTheDocument();
    expect(moves).toEqual([]);
  });

  it('shows an error and keeps the current order when a move fails', async () => {
    const { result } = setup();
    server.use(
      http.post('/content-manager/collection-types/:model/:id/actions/move', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ApplicationError',
              message: 'Custom order is not enabled for this content type',
              details: {},
            },
          },
          { status: 400 }
        )
      )
    );

    await act(async () => {
      await result.current.moveToIndex(0, 2);
    });

    expect(
      await screen.findByText('Custom order is not enabled for this content type')
    ).toBeInTheDocument();
    expect(result.current.isMoving).toBe(false);
    expect(result.current.rows).toBe(hookRows);
  });
});
