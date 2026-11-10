import { fireEvent, within } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ProvidersPage } from '../ProvidersPage';

import type { ProviderDetail, ProviderSummary } from '../../../../../shared/contracts/providers';

// Built at run time, like every secret-shaped value of a test
const NEW_SECRET = ['new', 'secret'].join('-');
const OIDC_SECRET = ['sh', 'h'].join('');

const summary = (overrides: Partial<ProviderSummary> & { id: string }): ProviderSummary => ({
  name: overrides.id,
  kind: 'social',
  source: 'admin',
  package: null,
  enabled: false,
  configured: false,
  status: 'disabled',
  redirectUri: `http://localhost:1337/api/end-users/auth/callback/${overrides.id}`,
  ...overrides,
});

const PROVIDERS: ProviderSummary[] = [
  summary({ id: 'github', name: 'GitHub', enabled: true, configured: true, status: 'ready' }),
  summary({
    id: 'okta',
    name: 'Okta',
    kind: 'oidc',
    source: 'config',
    enabled: true,
    configured: true,
    status: 'ready',
  }),
  summary({ id: 'google', name: 'Google' }),
  summary({ id: 'twitch', name: 'Twitch', kind: 'oidc', package: '@acme/end-users-twitch' }),
];

const DETAILS: Record<string, ProviderDetail> = {
  github: {
    ...PROVIDERS[0],
    clientId: 'gh-client',
    clientSecretSet: true,
    scopes: ['user:email'],
    trustForLinking: false,
    updateUserOnSignIn: false,
    profileMapping: [{ attribute: 'displayName', claim: 'name', when: 'sign-up' }],
    fields: { apiUrl: 'https://api.github.com', webhookSecret: { set: true }, enterprise: false },
    definition: {
      fields: {
        apiUrl: { type: 'url', label: 'API URL' },
        webhookSecret: { type: 'secret', label: 'Webhook secret' },
        enterprise: { type: 'boolean', label: 'GitHub Enterprise' },
        region: { type: 'select', label: 'Region', options: ['eu', 'us'] },
      },
      claims: {
        name: { type: 'string', label: 'Full name' },
        email: { type: 'string', label: 'Email' },
      },
    },
  },
  okta: {
    ...PROVIDERS[1],
    clientId: 'okta-client',
    clientSecretSet: true,
    scopes: ['openid'],
    trustForLinking: false,
    updateUserOnSignIn: false,
    profileMapping: [],
    fields: {},
    definition: { fields: {} },
  },
  google: {
    ...PROVIDERS[2],
    clientId: '',
    clientSecretSet: false,
    scopes: ['email', 'profile'],
    trustForLinking: false,
    updateUserOnSignIn: false,
    profileMapping: [],
    fields: {},
    definition: { fields: {} },
  },
  twitch: {
    ...PROVIDERS[3],
    clientId: '',
    clientSecretSet: false,
    scopes: ['openid'],
    trustForLinking: false,
    updateUserOnSignIn: false,
    profileMapping: [],
    fields: {},
    definition: { fields: {} },
  },
};

/** Serves the providers, and records what a save, a create and a delete send */
const serveProviders = (list: ProviderSummary[] = PROVIDERS) => {
  const sent = {
    put: [] as Array<{ id: string; body: Record<string, unknown> }>,
    post: [] as Array<Record<string, unknown>>,
    deleted: [] as string[],
  };

  server.use(
    http.get('/end-users/providers', () => HttpResponse.json({ data: list })),
    http.get('/end-users/providers/:id', ({ params }) =>
      HttpResponse.json({ data: DETAILS[params.id as string] })
    ),
    http.put('/end-users/providers/:id', async ({ params, request }) => {
      sent.put.push({ id: params.id as string, body: (await request.json()) as never });

      return HttpResponse.json({ data: DETAILS[params.id as string] });
    }),
    http.post('/end-users/providers', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;

      sent.post.push(body);

      return HttpResponse.json({
        data: {
          ...DETAILS.twitch,
          ...summary({ id: 'acme-sso', name: String(body.name), kind: 'oidc' }),
          discoveryUrl: body.discoveryUrl,
        },
      });
    }),
    http.delete('/end-users/providers/:id', ({ params }) => {
      sent.deleted.push(params.id as string);

      return HttpResponse.json({ data: { ok: true } });
    }),
    http.get('/content-manager/content-types', () =>
      HttpResponse.json({
        data: [
          {
            uid: 'plugin::end-users.profile',
            attributes: {
              user: { type: 'relation' },
              displayName: { type: 'string' },
              bio: { type: 'text' },
            },
          },
        ],
      })
    )
  );

  return sent;
};

const renderPage = () =>
  render(<ProvidersPage />, { initialEntries: ['/settings/end-users/providers'] });

/** The picker of a provider to add: the header button opens it, and its dialog holds the search */
const openPicker = async (user: ReturnType<typeof renderPage>['user']) => {
  await user.click(await screen.findByRole('button', { name: 'Add new provider' }));

  return within(await screen.findByRole('dialog', { name: 'Add a provider' })).findByRole(
    'combobox',
    { name: 'Provider' }
  );
};

const openProvider = async (user: ReturnType<typeof renderPage>['user'], name: string) => {
  await user.click(await screen.findByRole('button', { name: `Open ${name}` }));

  return screen.findByRole('dialog');
};

describe('ProvidersPage', () => {
  it('lists providers with status and source', async () => {
    serveProviders();
    renderPage();

    await screen.findByRole('heading', { name: 'Providers' });

    // Only the configured ones: Google and Twitch are offered by the picker
    const rows = screen.getAllByRole('row').slice(1);

    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('GitHub')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Admin')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Ready')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Okta')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Configured in config/plugins.ts')).toBeInTheDocument();
    // A provider from config cannot be deleted here
    expect(screen.queryByRole('button', { name: 'Delete Okta' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete GitHub' })).toBeInTheDocument();
  });

  it('lists a stored provider that is switched off, and does not offer it again', async () => {
    serveProviders([
      summary({ id: 'github', name: 'GitHub', enabled: false, configured: true }),
      summary({ id: 'google', name: 'Google' }),
    ]);
    const { user } = renderPage();

    await screen.findByRole('heading', { name: 'Providers' });

    const rows = screen.getAllByRole('row').slice(1);

    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('GitHub')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Off')).toBeInTheDocument();

    await user.click(await openPicker(user));

    expect(await screen.findByRole('option', { name: 'Google' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'GitHub' })).not.toBeInTheDocument();
  });

  it('finds a provider by any part of its name, and says when none matches', async () => {
    serveProviders();
    const { user } = renderPage();

    const picker = await openPicker(user);

    await user.type(picker, 'oidc');

    expect(await screen.findByRole('option', { name: 'Custom OIDC' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Google' })).not.toBeInTheDocument();

    await user.clear(picker);
    await user.type(picker, 'zzz');

    expect(await screen.findByText('No provider matches.')).toBeInTheDocument();
  });

  it('says so, with a way to add one, when no provider is configured', async () => {
    serveProviders([summary({ id: 'google', name: 'Google' })]);
    const { user } = renderPage();

    expect(await screen.findByText('No provider is configured yet.')).toBeInTheDocument();
    // The header's button and the empty state's
    expect(screen.getAllByRole('button', { name: 'Add new provider' })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Add new provider' })[1]);

    expect(await screen.findByRole('dialog', { name: 'Add a provider' })).toBeInTheDocument();
  });

  it('edits the profile mapping and sends it on save', async () => {
    const sent = serveProviders();
    const { user } = renderPage();

    const dialog = await openProvider(user, 'GitHub');

    expect(await within(dialog).findByDisplayValue('gh-client')).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Update user details on each sign-in' })
    );
    await user.click(within(dialog).getByRole('button', { name: 'Add mapping' }));

    const attributes = within(dialog).getAllByRole('combobox', { name: 'Profile attribute' });

    await user.click(attributes[1]);
    await user.click(await screen.findByRole('option', { name: 'bio' }));

    const claims = within(dialog).getAllByRole('combobox', { name: 'Claim' });

    await user.click(claims[1]);
    await user.type(claims[1], 'address.city');
    await user.click(await screen.findByText('Create "address.city"'));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent.put).toHaveLength(1));
    expect(sent.put[0].body).toMatchObject({
      updateUserOnSignIn: true,
      profileMapping: [
        { attribute: 'displayName', claim: 'name', when: 'sign-up' },
        { attribute: 'bio', claim: 'address.city', when: 'sign-up' },
      ],
    });

    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('removes a mapping row', async () => {
    const sent = serveProviders();
    const { user } = renderPage();

    const dialog = await openProvider(user, 'GitHub');

    await user.click(await within(dialog).findByRole('button', { name: 'Remove mapping row 1' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent.put).toHaveLength(1));
    expect(sent.put[0].body.profileMapping).toEqual([]);
  });

  it('adds a built-in from the picker, and an installed package', async () => {
    serveProviders();
    const { user } = renderPage();

    await user.click(await openPicker(user));

    expect(await screen.findByRole('option', { name: 'Google' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Twitch' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Custom OIDC' })).toBeInTheDocument();
    // By name, the custom one last
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Google',
      'Twitch',
      'Custom OIDC',
    ]);
    // What is configured is not offered again
    expect(screen.queryByRole('option', { name: 'GitHub' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'Google' }));

    const dialog = await screen.findByRole('dialog');

    expect(await within(dialog).findByText('Google')).toBeInTheDocument();
    // Scopes come prefilled from the definition
    expect(within(dialog).getByDisplayValue('email profile')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await user.click(await openPicker(user));
    await user.click(await screen.findByRole('option', { name: 'Twitch' }));

    expect(
      await within(await screen.findByRole('dialog')).findByText('Twitch')
    ).toBeInTheDocument();
  });

  it("renders the definition's fields and sends them on save", async () => {
    const sent = serveProviders();
    const { user } = renderPage();

    const dialog = await openProvider(user, 'GitHub');

    const apiUrl = await within(dialog).findByRole('textbox', { name: 'API URL' });

    await user.clear(apiUrl);
    await user.type(apiUrl, 'https://git.example.com/api');
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'GitHub Enterprise' }));
    await user.click(within(dialog).getByRole('combobox', { name: 'Region' }));
    await user.click(await screen.findByRole('option', { name: 'eu' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent.put).toHaveLength(1));
    expect(sent.put[0].body.fields).toEqual({
      apiUrl: 'https://git.example.com/api',
      enterprise: true,
      region: 'eu',
    });
  });

  it('saves a provider without sending an unchanged secret or secret field', async () => {
    const sent = serveProviders();
    const { user } = renderPage();

    let dialog = await openProvider(user, 'GitHub');

    // The secrets read "Set", never a value
    expect(await within(dialog).findAllByText('Set')).toHaveLength(2);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(sent.put).toHaveLength(1));

    expect(sent.put[0].body).not.toHaveProperty('clientSecret');
    expect(sent.put[0].body.fields).not.toHaveProperty('webhookSecret');

    // A secret that was replaced is sent
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    dialog = await openProvider(user, 'GitHub');

    const replace = await within(dialog).findAllByRole('button', { name: 'Replace' });

    await user.click(replace[0]);
    await user.type(within(dialog).getByLabelText(/Client secret/), NEW_SECRET);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent.put).toHaveLength(2));
    expect(sent.put[1].body).toMatchObject({ clientSecret: NEW_SECRET });
    expect(sent.put[1].body.fields).not.toHaveProperty('webhookSecret');
  });

  it('shows the server validation errors on their fields', async () => {
    serveProviders();
    server.use(
      http.put('/end-users/providers/github', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'apiUrl is not a URL',
              details: {
                errors: [{ path: ['fields', 'apiUrl'], message: 'apiUrl is not a URL' }],
              },
            },
          },
          { status: 400 }
        )
      )
    );
    const { user } = renderPage();

    const dialog = await openProvider(user, 'GitHub');

    fireEvent.click(await within(dialog).findByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('apiUrl is not a URL')).toBeInTheDocument();
  });

  it('asks for what is required before it asks the server, and says so on the fields', async () => {
    const sent = serveProviders();
    const { user } = renderPage();

    const dialog = await openProvider(user, 'GitHub');

    await user.clear(await within(dialog).findByRole('textbox', { name: /Client ID/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('This value is required.')).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Client ID/ })).toBeInvalid();
    expect(sent.put).toHaveLength(0);
  });

  it('shows what the server found missing as required on its field, with no key in the words', async () => {
    serveProviders();
    server.use(
      http.put('/end-users/providers/github', () =>
        HttpResponse.json(
          {
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'The provider "github" cannot be saved: `clientId` is missing',
              details: { errors: [{ path: ['clientId'], message: '`clientId` is missing' }] },
            },
          },
          { status: 400 }
        )
      )
    );
    const { user } = renderPage();

    const dialog = await openProvider(user, 'GitHub');

    fireEvent.click(await within(dialog).findByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('This value is required.')).toBeInTheDocument();
    expect(await screen.findByText('Check the fields marked with an error.')).toBeInTheDocument();
    expect(screen.queryByText(/cannot be saved/)).not.toBeInTheDocument();
  });

  it('asks before closing a provider with changes that are not saved', async () => {
    serveProviders();
    const { user } = renderPage();

    const dialog = await openProvider(user, 'GitHub');

    await user.type(await within(dialog).findByRole('textbox', { name: /Client ID/ }), '2');
    await user.keyboard('{Escape}');

    expect(await screen.findByText(/You have unsaved changes/)).toBeInTheDocument();
  });

  it('says what Trust for account linking does, and keeps Copy inside the redirect URI field', async () => {
    serveProviders();
    const { user } = renderPage();

    const dialog = await openProvider(user, 'GitHub');

    expect(
      await within(dialog).findByText(/linked to the existing account that has the same email/)
    ).toBeInTheDocument();
    // The copy button is the field's own action: the field's name labels both
    const uri = within(dialog).getByRole('textbox', { name: 'Redirect URI' });

    expect(uri).toHaveAttribute('readonly');
    expect(within(dialog).getByRole('button', { name: 'Copy redirect URI' })).toBeInTheDocument();
  });

  it('copies the redirect URI', async () => {
    serveProviders();
    const { user } = renderPage();

    const dialog = await openProvider(user, 'GitHub');

    await user.click(await within(dialog).findByRole('button', { name: 'Copy redirect URI' }));

    expect(await navigator.clipboard.readText()).toBe(
      'http://localhost:1337/api/end-users/auth/callback/github'
    );
  });

  it('names the fields of a custom OIDC provider left empty, and asks the server once they are filled', async () => {
    const sent = serveProviders();
    const { user } = renderPage();

    await user.click(await openPicker(user));
    await user.click(await screen.findByRole('option', { name: 'Custom OIDC' }));

    const dialog = await screen.findByRole('dialog');
    const add = within(dialog).getByRole('button', { name: 'Add provider' });

    // A submit button, so that Enter in a field submits the form
    expect(add).toHaveAttribute('type', 'submit');

    // It says what is asked, and what a discovery URL looks like
    expect(within(dialog).getByText(/What the provider is called/)).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Discovery URL/ })).toHaveAttribute(
      'placeholder',
      'https://issuer.example.com/.well-known/openid-configuration'
    );

    await user.type(within(dialog).getByRole('textbox', { name: /Name/ }), 'Acme SSO');
    fireEvent.click(add);

    expect(await within(dialog).findAllByText('This value is required.')).toHaveLength(3);
    expect(sent.post).toHaveLength(0);

    await user.type(
      within(dialog).getByRole('textbox', { name: /Discovery URL/ }),
      'https://sso.acme.test/.well-known/openid-configuration'
    );
    await user.type(within(dialog).getByRole('textbox', { name: /Client ID/ }), 'acme');
    await user.type(within(dialog).getByLabelText(/Client secret/), OIDC_SECRET);
    fireEvent.click(add);

    await waitFor(() => expect(sent.post).toHaveLength(1));
  });

  it('adds and deletes a custom OIDC provider', async () => {
    const sent = serveProviders();
    const { user } = renderPage();

    await user.click(await openPicker(user));
    await user.click(await screen.findByRole('option', { name: 'Custom OIDC' }));

    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByRole('textbox', { name: /Name/ }), 'Acme SSO');
    await user.type(
      within(dialog).getByRole('textbox', { name: /Discovery URL/ }),
      'https://sso.acme.test/.well-known/openid-configuration'
    );
    await user.type(within(dialog).getByRole('textbox', { name: /Client ID/ }), 'acme');
    await user.type(within(dialog).getByLabelText(/Client secret/), OIDC_SECRET);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add provider' }));

    await waitFor(() => expect(sent.post).toHaveLength(1));
    expect(sent.post[0]).toEqual({
      name: 'Acme SSO',
      discoveryUrl: 'https://sso.acme.test/.well-known/openid-configuration',
      clientId: 'acme',
      clientSecret: OIDC_SECRET,
    });

    // Deleting asks first
    await user.keyboard('{Escape}');
    await user.click(await screen.findByRole('button', { name: 'Delete GitHub' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(sent.deleted).toEqual(['github']));
  });

  it('shows a config provider locked, with no secret value', async () => {
    const sent = serveProviders();
    const { user } = renderPage();

    const dialog = await openProvider(user, 'Okta');

    expect(await within(dialog).findByDisplayValue('okta-client')).toBeDisabled();
    expect(within(dialog).getByText(/Change it there/)).toBeInTheDocument();
    expect(within(dialog).getByText('Set')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Client secret/)).not.toBeInTheDocument();
    expect(sent.put).toEqual([]);
  });
});
