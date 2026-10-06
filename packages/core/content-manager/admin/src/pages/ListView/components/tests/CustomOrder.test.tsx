import { Table } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen } from '@tests/utils';

import {
  CustomOrder,
  MoveToBottomAction,
  MoveToTopAction,
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
