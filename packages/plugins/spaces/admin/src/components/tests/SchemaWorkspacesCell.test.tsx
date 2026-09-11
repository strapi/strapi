import { render, screen } from '@tests/utils';
import { userEvent } from '@testing-library/user-event';

import { SchemaWorkspacesCell } from '../SchemaWorkspacesCell';

jest.mock('../../services/spaces', () => ({
  useGetMineSpacesQuery: jest.fn(() => ({
    data: [
      { slug: 'acme', name: 'Acme', color: '#EE5E52' },
      { slug: 'globex', name: 'Globex', color: '#4945FF' },
    ],
  })),
}));

const schema = (spaces: Record<string, unknown>) => ({ pluginOptions: { spaces } });

describe('SchemaWorkspacesCell', () => {
  it('says a content type bound to none is available in all of them', () => {
    render(<SchemaWorkspacesCell schema={schema({})} />);

    expect(screen.getByText('All workspaces')).toBeInTheDocument();
  });

  /**
   * A chip per workspace is unreadable at a glance and grows with the number
   * of workspaces, so the count is the cell and the names are a click away —
   * the way the Content Manager shows relations.
   */
  it('counts the workspaces, and names them on click', async () => {
    const user = userEvent.setup();
    render(<SchemaWorkspacesCell schema={schema({ visibleIn: ['acme', 'globex'] })} />);

    const trigger = screen.getByRole('button', { name: '2 workspaces' });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();

    await user.click(trigger);

    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Globex')).toBeInTheDocument();
  });

  it('counts one workspace in the singular', () => {
    render(<SchemaWorkspacesCell schema={schema({ visibleIn: ['acme'] })} />);

    expect(screen.getByRole('button', { name: '1 workspace' })).toBeInTheDocument();
  });

  it('says when entries are shared, beside the workspaces', () => {
    render(<SchemaWorkspacesCell schema={schema({ sharedEntries: true })} />);

    expect(screen.getByText('All workspaces')).toBeInTheDocument();
    expect(screen.getByText('Shared entries')).toBeInTheDocument();
  });
});
