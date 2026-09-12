import { GERMANY, server } from '@tests/server';
import { render, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { MembersModal } from '../MembersModal';

/** A member is known by their name, or by their email when they have none. */
interface User {
  id: number;
  firstname?: string;
  lastname?: string;
  email: string;
}

const ALICE: User = { id: 7, firstname: 'Alice', lastname: 'Martin', email: 'alice@example.com' };
const BOB: User = { id: 8, email: 'bob@example.com' };

const EDITOR = { id: 1, name: 'Editor' };
const AUTHOR = { id: 2, name: 'Author' };

interface Options {
  members?: Array<{ id: number; user: User; roles: Array<{ id: number; name: string }> }>;
  candidates?: User[];
  roles?: Array<{ id: number; name: string }>;
  /** Makes the write endpoints answer with this message instead of succeeding. */
  refuseWith?: string;
  /** Makes the admin role list fail, as it would for a caller who may not read it. */
  refuseRoles?: boolean;
}

/** What the modal was asked to write, so a test can check the payload. */
const setup = ({
  members = [],
  candidates = [BOB],
  roles = [EDITOR, AUTHOR],
  refuseWith,
  refuseRoles = false,
}: Options = {}) => {
  const writes: Array<{ method: string; path: string; body?: Record<string, unknown> }> = [];
  const refusal = () => HttpResponse.json({ error: { message: refuseWith } }, { status: 400 });

  server.use(
    http.get('*/spaces/spaces/:id/members', () => HttpResponse.json({ data: members })),
    http.get('*/spaces/spaces/:id/members/candidates', () =>
      HttpResponse.json({ data: candidates })
    ),
    http.get('*/admin/roles', () =>
      refuseRoles
        ? HttpResponse.json({ error: {} }, { status: 500 })
        : HttpResponse.json({ data: roles })
    ),
    http.post('*/spaces/spaces/:id/members', async ({ request }) => {
      if (refuseWith) {
        return refusal();
      }

      writes.push({
        method: 'POST',
        path: new URL(request.url).pathname,
        body: (await request.json()) as Record<string, unknown>,
      });

      return HttpResponse.json({ data: { id: 1, user: BOB, roles: [] } });
    }),
    http.delete('*/spaces/spaces/:id/members/:userId', ({ request }) => {
      if (refuseWith) {
        return refusal();
      }

      writes.push({ method: 'DELETE', path: new URL(request.url).pathname });

      return HttpResponse.json({ data: {} });
    })
  );

  return { writes, ...render(<MembersModal space={GERMANY} onClose={jest.fn()} />) };
};

const memberOf = (user: User, roles: Array<{ id: number; name: string }> = []) => ({
  id: user.id,
  user,
  roles,
});

describe('the members of a space', () => {
  describe('the list', () => {
    it('names the space it is about', async () => {
      setup();

      expect(await screen.findByText(/members of germany/i)).toBeVisible();
    });

    it('shows who belongs to it', async () => {
      setup({ members: [memberOf(ALICE)] });

      expect(await screen.findByText('Alice Martin')).toBeVisible();
    });

    it('falls back to the email of someone with no name', async () => {
      setup({ members: [memberOf(BOB)] });

      expect(await screen.findByText('bob@example.com')).toBeVisible();
    });

    it('explains what leaving the roles empty means', async () => {
      // It is the difference between "their usual roles" and "no roles", and
      // the one thing about this screen that is not self-evident.
      setup();

      expect(await screen.findByText(/keeps whatever roles the member holds/i)).toBeVisible();
    });
  });

  describe('adding someone', () => {
    it('is not offered until a person is chosen', async () => {
      setup();

      expect(await screen.findByRole('button', { name: /^add$/i })).toBeDisabled();
    });

    it('sends the person and no roles, meaning their usual ones', async () => {
      const { writes, user } = setup();

      await user.click(await screen.findByRole('combobox', { name: /add a member/i }));
      await user.click(await screen.findByRole('option', { name: 'bob@example.com' }));
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body).toEqual({ user: 8, roles: [] });
    });

    it('sends the roles that were chosen for this space', async () => {
      const { writes, user } = setup();

      await user.click(await screen.findByRole('combobox', { name: /add a member/i }));
      await user.click(await screen.findByRole('option', { name: 'bob@example.com' }));
      await user.click(screen.getByRole('combobox', { name: /roles in this space/i }));
      await user.click(await screen.findByRole('option', { name: 'Author' }));
      // The list stays open for a second choice, and hides the rest of the form.
      await user.keyboard('{Escape}');
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body).toEqual({ user: 8, roles: [2] });
    });

    it('offers only people who are not members yet', async () => {
      const { user } = setup({ members: [memberOf(ALICE)], candidates: [BOB] });

      await user.click(await screen.findByRole('combobox', { name: /add a member/i }));

      expect(await screen.findByRole('option', { name: 'bob@example.com' })).toBeVisible();
      expect(screen.queryByRole('option', { name: 'Alice Martin' })).not.toBeInTheDocument();
    });

    it('says why when the server refuses', async () => {
      const { user } = setup({ refuseWith: 'One of the given roles does not exist.' });

      await user.click(await screen.findByRole('combobox', { name: /add a member/i }));
      await user.click(await screen.findByRole('option', { name: 'bob@example.com' }));
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(await screen.findByText(/does not exist/i)).toBeVisible();
    });
  });

  describe('removing someone', () => {
    it('takes them out of this space', async () => {
      const { writes, user } = setup({ members: [memberOf(ALICE)] });

      await screen.findByText('Alice Martin');
      await user.click(screen.getByRole('button', { name: /remove from this space/i }));

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0]).toMatchObject({ method: 'DELETE', path: '/spaces/spaces/2/members/7' });
    });

    it('says why when the server refuses', async () => {
      const { user } = setup({ members: [memberOf(ALICE)], refuseWith: 'Not allowed here.' });

      await screen.findByText('Alice Martin');
      await user.click(screen.getByRole('button', { name: /remove from this space/i }));

      expect(await screen.findByText(/not allowed here/i)).toBeVisible();
    });
  });

  describe('the roles a member holds here', () => {
    it('start as the ones already recorded', async () => {
      setup({ members: [memberOf(ALICE, [EDITOR])] });

      await screen.findByText('Alice Martin');

      expect(
        screen.getAllByRole('combobox', { name: /roles in this space/i })[1]
      ).toHaveTextContent('Editor');
    });

    it('are saved as soon as they change', async () => {
      // There is no separate save: the row is the control.
      const { writes, user } = setup({ members: [memberOf(ALICE)] });

      await screen.findByText('Alice Martin');
      await user.click(screen.getAllByRole('combobox', { name: /roles in this space/i })[1]);
      await user.click(await screen.findByRole('option', { name: 'Editor' }));

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body).toEqual({ user: 7, roles: [1] });
    });
  });

  describe('when the roles cannot be read', () => {
    it('the screen still works, with no roles to choose from', async () => {
      setup({ members: [memberOf(ALICE)], refuseRoles: true });

      expect(await screen.findByText('Alice Martin')).toBeVisible();
    });
  });
});
