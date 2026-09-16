import { render as renderAdmin } from '@strapi/admin/strapi-admin/test';
import { within } from '@testing-library/react';
import { FRANCE, GERMANY, server } from '@tests/server';
import { render, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { PERMISSIONS } from '../../constants';
import { SettingsPage } from '../SettingsPage';

/**
 * Renders with only the permissions named. The shared helper grants all of
 * them, which is what most tests want and exactly what these must not have.
 */
const renderWith = (...granted: Array<keyof typeof PERMISSIONS>) =>
  renderAdmin(<SettingsPage />, {
    // The function form replaces the default permissions; an array adds to them.
    providerOptions: { permissions: () => granted.flatMap((name) => PERMISSIONS[name]) },
  });

const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name, 'i') });

describe('the Spaces settings page', () => {
  describe('the list', () => {
    it('shows every space in the project', async () => {
      render(<SettingsPage />);

      expect(await screen.findByText('France')).toBeVisible();
      expect(screen.getByText('Germany')).toBeVisible();
    });

    it('marks the one everyone falls back to', async () => {
      render(<SettingsPage />);

      await screen.findByText('France');

      expect(rowFor('France')).toHaveTextContent('(default)');
      expect(rowFor('Germany')).not.toHaveTextContent('(default)');
    });

    it('says a space uses every content type when it names none', async () => {
      render(<SettingsPage />);

      await screen.findByText('France');

      expect(within(rowFor('France')).getByText('All')).toBeVisible();
    });

    it('counts the content types a space limits itself to', async () => {
      server.use(
        http.get('*/spaces/spaces', () =>
          HttpResponse.json({
            data: [{ ...FRANCE, contentTypes: ['api::article.article', 'api::page.page'] }],
          })
        )
      );

      render(<SettingsPage />);

      expect(await screen.findByText('2 types')).toBeVisible();
    });

    it('says so when there is no space yet', async () => {
      server.use(http.get('*/spaces/spaces', () => HttpResponse.json({ data: [] })));

      render(<SettingsPage />);

      expect(await screen.findByText(/no space yet/i)).toBeVisible();
    });

    it('says so when the list cannot be read', async () => {
      server.use(
        http.get('*/spaces/spaces', () => HttpResponse.json({ error: {} }, { status: 500 }))
      );

      render(<SettingsPage />);

      expect(await screen.findByText(/something went wrong/i)).toBeVisible();
    });
  });

  describe('what a caller is offered', () => {
    it('is nothing but the list, with read alone', async () => {
      // The page is reachable with `read`, so every control has to be gated.
      renderWith('read');

      await screen.findByText('France');

      expect(screen.queryByRole('button', { name: /create a space/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /manage members/i })).not.toBeInTheDocument();
    });

    it('is the members button alone, with the members permission', async () => {
      // Both actions end in `manage`, and `useRBAC` names what it finds after
      // the last segment — so holding one used to look like holding both.
      renderWith('read', 'manageMembers');

      await screen.findByText('France');

      expect(screen.getAllByRole('button', { name: /manage members/i })).toHaveLength(2);
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /create a space/i })).not.toBeInTheDocument();
    });

    it('is the space controls alone, with the manage permission', async () => {
      renderWith('read', 'manage');

      await screen.findByText('France');

      expect(screen.getByRole('button', { name: /create a space/i })).toBeVisible();
      expect(screen.getAllByRole('button', { name: /^edit$/i })).toHaveLength(2);
      expect(screen.queryByRole('button', { name: /manage members/i })).not.toBeInTheDocument();
    });

    it('is everything, with both', async () => {
      renderWith('read', 'manage', 'manageMembers');

      await screen.findByText('France');

      expect(screen.getByRole('button', { name: /create a space/i })).toBeVisible();
      expect(screen.getAllByRole('button', { name: /manage members/i })).toHaveLength(2);
    });
  });

  describe('the default space', () => {
    it('cannot be deleted, so the offer is not made', async () => {
      // Every caller without a space of their own falls back to it.
      renderWith('read', 'manage');

      await screen.findByText('France');

      expect(
        within(rowFor('France')).queryByRole('button', { name: /delete/i })
      ).not.toBeInTheDocument();
      expect(within(rowFor('Germany')).getByRole('button', { name: /delete/i })).toBeVisible();
    });

    it('is not offered as a default again', async () => {
      renderWith('read', 'manage');

      await screen.findByText('France');

      expect(
        within(rowFor('France')).queryByRole('button', { name: /make default/i })
      ).not.toBeInTheDocument();
      expect(
        within(rowFor('Germany')).getByRole('button', { name: /make default/i })
      ).toBeVisible();
    });

    it('can be moved to another space', async () => {
      const writes: string[] = [];
      server.use(
        http.put('*/spaces/spaces/:id/default', ({ params }) => {
          writes.push(String(params.id));

          return HttpResponse.json({ data: GERMANY });
        })
      );
      const { user } = renderWith('read', 'manage');

      await screen.findByText('Germany');
      await user.click(within(rowFor('Germany')).getByRole('button', { name: /make default/i }));

      await waitFor(() => expect(writes).toEqual(['2']));
    });
  });

  describe('deleting a space', () => {
    it('asks first, spelling out what goes with it', async () => {
      const { user } = renderWith('read', 'manage');

      await screen.findByText('Germany');
      await user.click(within(rowFor('Germany')).getByRole('button', { name: /delete/i }));

      expect(await screen.findByText(/permanently removes every entry/i)).toBeVisible();
      expect(screen.getByText(/"Germany"/)).toBeVisible();
    });

    it('does nothing until the question is answered', async () => {
      const writes: string[] = [];
      server.use(
        http.delete('*/spaces/spaces/:id', ({ params }) => {
          writes.push(String(params.id));

          return HttpResponse.json({ data: {} });
        })
      );
      const { user } = renderWith('read', 'manage');

      await screen.findByText('Germany');
      await user.click(within(rowFor('Germany')).getByRole('button', { name: /delete/i }));
      await screen.findByText(/permanently removes/i);

      expect(writes).toEqual([]);
    });

    it('goes ahead once it is', async () => {
      const writes: string[] = [];
      server.use(
        http.delete('*/spaces/spaces/:id', ({ params }) => {
          writes.push(String(params.id));

          return HttpResponse.json({ data: {} });
        })
      );
      const { user } = renderWith('read', 'manage');

      await screen.findByText('Germany');
      await user.click(within(rowFor('Germany')).getByRole('button', { name: /delete/i }));
      await user.click(await screen.findByRole('button', { name: /confirm/i }));

      await waitFor(() => expect(writes).toEqual(['2']));
    });
  });

  describe('the forms it opens', () => {
    it('opens an empty one to create a space', async () => {
      const { user } = renderWith('read', 'manage');

      await screen.findByText('France');
      await user.click(screen.getByRole('button', { name: /create a space/i }));

      expect(await screen.findByRole('textbox', { name: /name/i })).toHaveValue('');
    });

    it('opens a filled one to edit one', async () => {
      const { user } = renderWith('read', 'manage');

      await screen.findByText('Germany');
      await user.click(within(rowFor('Germany')).getByRole('button', { name: /^edit$/i }));

      expect(await screen.findByRole('textbox', { name: /name/i })).toHaveValue('Germany');
    });
  });
});
