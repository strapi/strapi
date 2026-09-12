import { fireEvent } from '@testing-library/react';
import { FRANCE, GERMANY, server } from '@tests/server';
import { render, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { SpaceModal } from '../SpaceModal';

/**
 * jsdom does not submit a form when its submit button is clicked, so the event
 * is dispatched directly — the same workaround the admin's own form tests use.
 * It is raised on the button and bubbles to the form, as a real one would.
 */
const save = async () => {
  fireEvent.submit(await screen.findByRole('button', { name: /save/i }));
};

/** What the server was asked to write, so a test can check the payload. */
const captureWrites = () => {
  const writes: Array<{ method: string; url: string; body: Record<string, unknown> }> = [];

  server.use(
    http.post('*/spaces/spaces', async ({ request }) => {
      writes.push({
        method: 'POST',
        url: request.url,
        body: (await request.json()) as Record<string, unknown>,
      });

      return HttpResponse.json({ data: FRANCE });
    }),
    http.put('*/spaces/spaces/:id', async ({ request }) => {
      writes.push({
        method: 'PUT',
        url: request.url,
        body: (await request.json()) as Record<string, unknown>,
      });

      return HttpResponse.json({ data: FRANCE });
    })
  );

  return writes;
};

const refuseWith = (message: string) => {
  server.use(
    http.post('*/spaces/spaces', () => HttpResponse.json({ error: { message } }, { status: 400 }))
  );
};

describe('the space form', () => {
  describe('creating', () => {
    it('sends what was typed', async () => {
      const writes = captureWrites();
      const { user } = render(<SpaceModal space={null} onClose={jest.fn()} />);

      await user.type(await screen.findByRole('textbox', { name: /name/i }), 'Italy');
      await save();

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body).toMatchObject({ name: 'Italy', contentTypes: null });
    });

    it('lets the slug be derived from the name', async () => {
      // Left empty, the server decides — which is what most people want.
      const writes = captureWrites();
      const { user } = render(<SpaceModal space={null} onClose={jest.fn()} />);

      await user.type(await screen.findByRole('textbox', { name: /name/i }), 'Italy');
      await save();

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body.slug).toBeUndefined();
    });

    it('sends a slug that was typed', async () => {
      const writes = captureWrites();
      const { user } = render(<SpaceModal space={null} onClose={jest.fn()} />);

      await user.type(await screen.findByRole('textbox', { name: /name/i }), 'Italy');
      await user.type(screen.getByRole('textbox', { name: /slug/i }), 'it');
      await save();

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body.slug).toBe('it');
    });

    it('closes once the space exists', async () => {
      captureWrites();
      const onClose = jest.fn();
      const { user } = render(<SpaceModal space={null} onClose={onClose} />);

      await user.type(await screen.findByRole('textbox', { name: /name/i }), 'Italy');
      await save();

      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('stays open and says why when the server refuses', async () => {
      // Closing would lose what was typed and leave no trace of the reason.
      refuseWith('A space with the slug "italy" already exists.');
      const onClose = jest.fn();
      const { user } = render(<SpaceModal space={null} onClose={onClose} />);

      await user.type(await screen.findByRole('textbox', { name: /name/i }), 'Italy');
      await save();

      expect(await screen.findByText(/already exists/i)).toBeVisible();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('editing', () => {
    it('fills the form with the space as it is', async () => {
      render(<SpaceModal space={GERMANY} onClose={jest.fn()} />);

      expect(await screen.findByRole('textbox', { name: /name/i })).toHaveValue('Germany');
      expect(screen.getByRole('textbox', { name: /slug/i })).toHaveValue('germany');
    });

    it('does not let the slug be changed', async () => {
      // API tokens and saved links name a space by it.
      render(<SpaceModal space={GERMANY} onClose={jest.fn()} />);

      expect(await screen.findByRole('textbox', { name: /slug/i })).toBeDisabled();
      expect(screen.getByText(/cannot change/i)).toBeVisible();
    });

    it('does not send the slug back', async () => {
      const writes = captureWrites();
      render(<SpaceModal space={GERMANY} onClose={jest.fn()} />);

      await save();

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body.slug).toBeUndefined();
    });

    it('offers to archive a space', async () => {
      const writes = captureWrites();
      render(<SpaceModal space={GERMANY} onClose={jest.fn()} />);

      // The toggle's own input sits under the styled track, which is what
      // user-event aims at; the event goes to the input directly instead.
      fireEvent.click(await screen.findByRole('checkbox', { name: /archived/i }));
      await save();

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body.status).toBe('archived');
    });

    it('does not offer to archive the default space', async () => {
      // Nothing could fall back to it afterwards, so the server refuses anyway.
      render(<SpaceModal space={FRANCE} onClose={jest.fn()} />);

      await screen.findByRole('textbox', { name: /name/i });

      expect(screen.queryByRole('checkbox', { name: /archived/i })).not.toBeInTheDocument();
    });
  });

  describe('limiting a space to some content types', () => {
    it('is off to begin with, meaning every content type', async () => {
      render(<SpaceModal space={null} onClose={jest.fn()} />);

      expect(await screen.findByRole('checkbox', { name: /limit this space/i })).not.toBeChecked();
      expect(screen.queryByRole('checkbox', { name: 'Article' })).not.toBeInTheDocument();
    });

    it('sends the content types that were ticked', async () => {
      const writes = captureWrites();
      const { user } = render(<SpaceModal space={null} onClose={jest.fn()} />);

      await user.type(await screen.findByRole('textbox', { name: /name/i }), 'Italy');
      await user.click(screen.getByRole('checkbox', { name: /limit this space/i }));
      await user.click(await screen.findByRole('checkbox', { name: 'Article' }));
      await save();

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body.contentTypes).toEqual(['api::article.article']);
    });

    it('sends nothing at all when the list is emptied again', async () => {
      // An empty list is a real choice: a space that may use nothing.
      const writes = captureWrites();
      const { user } = render(<SpaceModal space={null} onClose={jest.fn()} />);

      await user.type(await screen.findByRole('textbox', { name: /name/i }), 'Italy');
      await user.click(screen.getByRole('checkbox', { name: /limit this space/i }));
      await user.click(await screen.findByRole('checkbox', { name: 'Article' }));
      await user.click(screen.getByRole('checkbox', { name: 'Article' }));
      await save();

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body.contentTypes).toEqual([]);
    });

    it('goes back to every content type when the limit is turned off', async () => {
      const writes = captureWrites();
      const { user } = render(<SpaceModal space={null} onClose={jest.fn()} />);

      await user.type(await screen.findByRole('textbox', { name: /name/i }), 'Italy');
      await user.click(screen.getByRole('checkbox', { name: /limit this space/i }));
      await user.click(await screen.findByRole('checkbox', { name: 'Article' }));
      await user.click(screen.getByRole('checkbox', { name: /limit this space/i }));
      await save();

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body.contentTypes).toBeNull();
    });

    it('starts ticked for a space that already names some', async () => {
      const limited = { ...GERMANY, contentTypes: ['api::article.article'] };

      render(<SpaceModal space={limited} onClose={jest.fn()} />);

      await waitFor(() =>
        expect(screen.getByRole('checkbox', { name: /limit this space/i })).toBeChecked()
      );
      expect(await screen.findByRole('checkbox', { name: 'Article' })).toBeChecked();
    });

    it('says so when the project has no content types to offer', async () => {
      server.use(
        http.get('*/spaces/settings', () =>
          HttpResponse.json({ data: { contentTypes: [], maxSpaces: null, sharedRows: {} } })
        )
      );
      const { user } = render(<SpaceModal space={null} onClose={jest.fn()} />);

      await user.click(await screen.findByRole('checkbox', { name: /limit this space/i }));

      expect(await screen.findByText(/no content types yet/i)).toBeVisible();
    });
  });
});
