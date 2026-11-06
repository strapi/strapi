import { within } from '@testing-library/react';
import { render, screen } from '@tests/utils';

import { ARTICLE, ARTICLE_ROUTES, LAYOUT, serveRoles } from '../../tests/fixtures';
import { DetailsPane } from '../DetailsPane';

import type { BoundRoute, PermissionRow } from '../../../../../../shared/contracts/permissions';

/** The rows of a role that is granted these actions, as the page hands them over */
const granted = (...actions: string[]): PermissionRow[] =>
  actions.map((action) => ({ action, subject: null, properties: {}, conditions: [] }));

const article = { tab: 'collectionTypes' as const, id: ARTICLE };

const rule = (name: string, config: Record<string, unknown> = {}): BoundRoute['rules'][number] => ({
  kind: 'policy',
  name: `global::${name}`,
  label: name,
  config,
});

describe('DetailsPane', () => {
  it('shows the routes of the open content type and what is granted', async () => {
    serveRoles();

    render(
      <DetailsPane
        open={article}
        layout={LAYOUT}
        rows={granted(`${ARTICLE}.find`, `${ARTICLE}.update`)}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Routes bound to Article' })).toBeVisible();

    // Update is granted, and its route runs a policy
    const update = await screen.findByRole('group', { name: 'Update' });

    expect(within(update).getByText('Granted')).toBeVisible();
    expect(within(update).getByText('PUT')).toBeVisible();
    expect(within(update).getByText('/api/articles/:id')).toBeVisible();
    expect(within(update).getByText('Owner only')).toBeVisible();
    expect(within(update).getByText('Policy')).toBeVisible();

    // Delete is not, and its route runs nothing
    const remove = screen.getByRole('group', { name: 'Delete' });

    expect(within(remove).getByText('Not granted')).toBeVisible();
    expect(within(remove).getByText('DELETE')).toBeVisible();
    expect(within(remove).queryByText('Policy')).not.toBeInTheDocument();
  });

  it('explains Read drafts, which has no route of its own', async () => {
    serveRoles();

    render(<DetailsPane open={article} layout={LAYOUT} rows={granted(`${ARTICLE}.read-drafts`)} />);

    const drafts = await screen.findByRole('group', { name: 'Read drafts' });

    expect(within(drafts).getByText('Granted')).toBeVisible();
    expect(within(drafts).getByText('Lets Find and Find one return drafts.')).toBeVisible();
  });

  it('lists the first three rules of a route, then the rest on request', async () => {
    serveRoles(undefined, undefined, {
      [ARTICLE]: ARTICLE_ROUTES.map((route) =>
        route.actionId === `${ARTICLE}.update`
          ? { ...route, rules: ['first', 'second', 'third', 'fourth'].map((name) => rule(name)) }
          : route
      ),
    });

    const { user } = render(<DetailsPane open={article} layout={LAYOUT} rows={[]} />);

    const update = await screen.findByRole('group', { name: 'Update' });

    expect(within(update).getByText('third')).toBeVisible();
    expect(within(update).queryByText('fourth')).not.toBeInTheDocument();

    await user.click(within(update).getByRole('button', { name: 'Show 1 more' }));

    expect(within(update).getByText('fourth')).toBeVisible();

    await user.click(within(update).getByRole('button', { name: 'Show fewer' }));

    expect(within(update).queryByText('fourth')).not.toBeInTheDocument();
  });

  it('shows the settings of a rule as the server gives them', async () => {
    serveRoles(undefined, undefined, {
      [ARTICLE]: [
        {
          actionId: `${ARTICLE}.find`,
          method: 'GET',
          path: '/api/articles',
          rules: [
            {
              kind: 'middleware',
              name: 'global::rate-limit',
              label: 'Rate limit',
              config: { max: 5, apiKey: '[redacted]' },
            },
          ],
        },
      ],
    });

    render(<DetailsPane open={article} layout={LAYOUT} rows={[]} />);

    const find = await screen.findByRole('group', { name: 'Find' });

    expect(within(find).getByText('Rate limit')).toBeVisible();
    expect(within(find).getByText(/max: 5, apiKey: \[redacted\]/)).toBeVisible();
    expect(within(find).getByText('Middleware')).toBeVisible();
  });

  it('shows the routes of a plugin', async () => {
    serveRoles(undefined, undefined, {
      'plugin::end-users': [
        {
          actionId: 'plugin::end-users.me.find',
          method: 'GET',
          path: '/api/users/me',
          rules: [],
        },
      ],
    });

    render(
      <DetailsPane
        open={{ tab: 'plugins', id: 'plugin::end-users' }}
        layout={LAYOUT}
        rows={granted('plugin::end-users.me.find')}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Routes bound to End users' })).toBeVisible();

    const find = await screen.findByRole('group', { name: 'Find' });

    expect(within(find).getByText('Granted')).toBeVisible();
    expect(await within(find).findByText('/api/users/me')).toBeVisible();
  });
});
