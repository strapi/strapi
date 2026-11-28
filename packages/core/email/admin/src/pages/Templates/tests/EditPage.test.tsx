import { fireEvent } from '@testing-library/react';
import { DETAIL } from '@tests/server';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { PERMISSIONS } from '../../../constants';
import { EditPage } from '../EditPage';

const KEY = 'end-users.confirm-email';

const renderEdit = (options: Parameters<typeof render>[1] = {}) =>
  render(
    <Routes>
      <Route path="/:key" element={<EditPage />} />
    </Routes>,
    { initialEntries: [`/${KEY}`], ...options }
  );

describe('Templates EditPage', () => {
  it('saves subject, html and text for the chosen locale', async () => {
    const saved = jest.fn();

    server.use(
      http.put('/email/templates/:key', async ({ request }) => {
        saved({
          locale: new URL(request.url).searchParams.get('locale'),
          body: await request.json(),
        });

        return HttpResponse.json({ data: {} });
      })
    );

    const { user } = renderEdit();

    await user.click(await screen.findByRole('combobox', { name: 'Locale' }));
    await user.click(await screen.findByRole('option', { name: 'fr' }));

    // The fr content has loaded once its subject shows.
    const subject = await screen.findByDisplayValue('Confirm your email (fr)');
    await user.clear(subject);
    await user.type(subject, 'Confirmez');

    const html = screen.getByRole('textbox', { name: 'HTML' });
    await user.clear(html);
    await user.type(html, '<p>Bonjour</p>');

    const text = screen.getByRole('textbox', { name: 'Plain text' });
    await user.clear(text);
    await user.type(text, 'Bonjour');

    // user-event's click on a submit button does not submit the form under jsdom here.
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Template saved')).toBeInTheDocument();
    expect(saved).toHaveBeenCalledWith({
      locale: 'fr',
      body: { subject: 'Confirmez', html: '<p>Bonjour</p>', text: 'Bonjour' },
    });
  });

  it('shows the reason the server gave when a save is refused', async () => {
    server.use(
      http.put('/email/templates/:key', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'The HTML puts {{ url }} where it could leak',
              details: {},
            },
          },
          { status: 400 }
        )
      )
    );

    renderEdit();

    await screen.findByRole('textbox', { name: 'HTML' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('The HTML puts {{ url }} where it could leak')
    ).toBeInTheDocument();
    expect(screen.queryByText('Could not save the template')).not.toBeInTheDocument();
  });

  it('shows the generic message when a save fails for another reason', async () => {
    server.use(
      http.put('/email/templates/:key', () =>
        HttpResponse.json({ error: { message: 'boom' } }, { status: 500 })
      )
    );

    renderEdit();

    await screen.findByRole('textbox', { name: 'HTML' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Could not save the template')).toBeInTheDocument();
  });

  it('says near the HTML field what saving removes', async () => {
    renderEdit();

    const html = await screen.findByRole('textbox', { name: 'HTML' });

    expect(html).toHaveAccessibleDescription(/Saving removes scripts/);
  });

  it('inserts a variable at the cursor', async () => {
    const { user } = renderEdit();

    const html = await screen.findByRole('textbox', { name: 'HTML' });

    // Put the cursor right after "Hello ".
    await user.click(html);
    (html as HTMLTextAreaElement).setSelectionRange(9, 9);
    await user.click(screen.getByRole('button', { name: '{{ url }}' }));

    expect(html).toHaveValue('<p>Hello {{ url }}{{ name }}</p>');
  });

  it('resets after confirmation', async () => {
    const reset = jest.fn();
    server.use(
      http.delete('/email/templates/:key', ({ request }) => {
        reset(new URL(request.url).searchParams.get('locale'));

        return HttpResponse.json({ data: { ok: true } });
      })
    );

    const { user } = renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Reset to default' }));
    expect(reset).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Template reset to default')).toBeInTheDocument();
    expect(reset).toHaveBeenCalledWith('en');
  });

  it('sends a test and shows the result', async () => {
    const { user } = renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Send test' }));
    expect(await screen.findByText('Test email sent to your address')).toBeInTheDocument();

    server.use(
      http.post('/email/templates/:key/test', () =>
        HttpResponse.json({ error: { message: 'No provider' } }, { status: 500 })
      )
    );

    await user.click(screen.getByRole('button', { name: 'Send test' }));
    expect(await screen.findByText('Could not send the test email')).toBeInTheDocument();
  });

  it('sends the unsaved content of the editor with the test', async () => {
    const sent = jest.fn();
    server.use(
      http.post('/email/templates/:key/test', async ({ request }) => {
        sent(await request.json());

        return HttpResponse.json({ data: { ok: true } });
      })
    );

    const { user } = renderEdit();

    const subject = await screen.findByRole('textbox', { name: 'Subject' });
    await user.clear(subject);
    await user.type(subject, 'Draft');
    await user.click(screen.getByRole('button', { name: 'Send test' }));

    expect(await screen.findByText('Test email sent to your address')).toBeInTheDocument();
    expect(sent).toHaveBeenCalledWith({
      subject: 'Draft',
      html: '<p>Hello {{ name }}</p>',
      text: 'Hello {{ name }}',
    });
  });

  it('shows the reason when the test content is refused', async () => {
    server.use(
      http.post('/email/templates/:key/test', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'No secret there',
              details: {},
            },
          },
          { status: 400 }
        )
      )
    );

    const { user } = renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Send test' }));

    expect(await screen.findByText('No secret there')).toBeInTheDocument();
  });

  it('is read-only without templates.update', async () => {
    renderEdit({ providerOptions: { permissions: PERMISSIONS.templatesRead } });

    const subject = await screen.findByRole('textbox', { name: 'Subject' });

    expect(subject).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'HTML' })).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'Plain text' })).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset to default' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send test' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '{{ name }}' })).toBeDisabled();
  });

  it('encodes a key containing slashes and dots in every request path', async () => {
    const key = '../../users/1';
    const encoded = '..%2F..%2Fusers%2F1';
    const paths: string[] = [];
    const record = ({ request }: { request: Request }) => {
      paths.push(`${request.method} ${new URL(request.url).pathname}`);

      return HttpResponse.json({ data: { ...DETAIL, key } });
    };

    server.use(
      http.get('/email/templates/*', record),
      http.put('/email/templates/*', record),
      http.delete('/email/templates/*', record),
      http.post('/email/templates/*', record)
    );

    const { user } = render(
      <Routes>
        <Route path="/:key" element={<EditPage />} />
      </Routes>,
      { initialEntries: [`/${encodeURIComponent(key)}`] }
    );

    await user.click(await screen.findByRole('button', { name: 'Send test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Reset to default' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(paths).toContain(`DELETE /email/templates/${encoded}`));
    expect(paths).toEqual(
      expect.arrayContaining([
        `GET /email/templates/${encoded}`,
        `POST /email/templates/${encoded}/test`,
        `PUT /email/templates/${encoded}`,
      ])
    );
    paths.forEach((path) => expect(path).not.toContain('..'.concat('/')));
  });
});
