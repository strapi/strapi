import { render, screen } from '@tests/utils';

import { Table } from '../Table';

import type { ApiToken } from '../../../../../../../shared/contracts/api-token';

const TOKEN = {
  id: 1,
  name: 'Ops token',
  description: 'For the ops team',
  kind: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUsedAt: null,
  adminUserOwner: { id: 1, firstname: 'Kai', lastname: 'Doe', email: 'kai@doe.test' },
} as unknown as ApiToken;

const PERMISSIONS = { canRead: true, canDelete: false, canUpdate: false };

describe('Tokens | Table', () => {
  it('renders the cells in the order of the headers, plugin cells included', () => {
    render(
      <Table
        permissions={PERMISSIONS}
        tokenType="api-token"
        onConfirmDelete={jest.fn()}
        tokens={[TOKEN]}
        showOwner
        headers={[
          { name: 'name', label: 'Name' },
          { name: 'team', label: 'Team', cellFormatter: () => 'Ops' },
          { name: 'description', label: 'Description' },
          { name: 'adminUserOwner', label: 'Owner' },
        ]}
      />
    );

    const cells = Array.from(screen.getByText('Ops token').closest('tr')!.querySelectorAll('td'));

    expect(cells.slice(0, 4).map((cell) => cell.textContent)).toEqual([
      'Ops token',
      'Ops',
      'For the ops team',
      'Kai Doe',
    ]);
  });
});
