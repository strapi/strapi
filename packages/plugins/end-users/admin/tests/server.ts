import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { RoleListItem } from '../../shared/contracts/roles';

const ROLES = [
  {
    documentId: 'public',
    name: 'Public',
    description: 'Default role given to unauthenticated user.',
    type: 'public',
    requireTwoFactor: false,
    usersCount: 0,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
  },
  {
    documentId: 'authenticated',
    name: 'Authenticated',
    description: 'Default role given to authenticated user.',
    type: 'authenticated',
    requireTwoFactor: false,
    usersCount: 1240,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
  },
  {
    documentId: 'p1',
    name: 'Premium member',
    description: 'Paid subscribers. Can read drafts and every article field.',
    type: 'custom',
    requireTwoFactor: true,
    usersCount: 212,
    createdAt: '2026-11-02T09:00:00.000Z',
    updatedAt: '2026-11-02T09:00:00.000Z',
  },
] satisfies RoleListItem[];

export const server = setupServer(
  /**
   *
   * roles
   *
   */
  http.get('/end-users/roles', () => {
    // The server lists roles by name, not Public first: the page orders them itself
    return HttpResponse.json({
      data: [...ROLES].sort((a, b) => a.name.localeCompare(b.name)),
    });
  })
);
