import { render, screen, server, waitFor } from '@tests/utils';
import { ACTIVE, CHECK, REPORT, serveMigration } from '@tests/migrationFixtures';
import { http, HttpResponse } from 'msw';

import { AdvancedPage } from '../AdvancedPage';
import { MigrationSection } from '../MigrationSection';

describe('MigrationSection', () => {
  it('shows only the migration page in check mode', async () => {
    const settingsReads: string[] = [];

    serveMigration(CHECK);
    server.use(
      http.get('/end-users/settings', () => {
        settingsReads.push('read');

        return new HttpResponse(null, { status: 404 });
      })
    );
    render(<AdvancedPage />, { initialEntries: ['/settings/end-users/advanced'] });

    expect(await screen.findByRole('heading', { name: 'Migration' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Redirects' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(settingsReads).toHaveLength(0);
  });

  it('runs the check again and shows the new report', async () => {
    let report = CHECK.report;
    const checked: string[] = [];

    serveMigration(() => ({ ...CHECK, report }));
    server.use(
      http.post('/end-users/migration/check', () => {
        checked.push('run');
        report = {
          ...CHECK.report!,
          generatedAt: '2026-11-09T12:00:00.000Z',
          counts: { ...CHECK.report!.counts, users: 5000 },
        };

        return HttpResponse.json({ data: { ...CHECK, report } });
      })
    );
    const { user } = render(<MigrationSection />);

    expect(await screen.findByText('1,240')).toBeInTheDocument();
    expect(screen.getByText('Nov 8, 2026')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Check again' }));

    expect(await screen.findByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('Nov 9, 2026')).toBeInTheDocument();
    expect(checked).toHaveLength(1);
  });

  it('lists every item and marks an acknowledged one resolved', async () => {
    const sent: unknown[] = [];

    serveMigration(ACTIVE);
    server.use(
      http.put('/end-users/migration/items/:id', async ({ request, params }) => {
        sent.push({ id: params.id, body: await request.json() });

        return HttpResponse.json({ data: { ...REPORT.items[0], resolved: true } });
      })
    );
    const { user } = render(<MigrationSection />);

    expect(await screen.findByText('A role was renamed')).toBeInTheDocument();
    expect(screen.getByText('GitHub needs a new secret')).toBeInTheDocument();
    expect(screen.getByText('API tokens are not changed')).toBeInTheDocument();
    expect(screen.getByText('1 affected')).toBeInTheDocument();

    const boxes = screen.getAllByRole('checkbox', { name: 'Mark resolved' });

    // The role item is open, the API token item is already resolved
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).not.toBeChecked();
    expect(boxes[1]).toBeChecked();

    await user.click(boxes[0]);

    await waitFor(() =>
      expect(sent).toEqual([{ id: 'role-renamed:author', body: { resolved: true } }])
    );
  });

  it('shows what resolves a provider that needs input instead of a checkbox', async () => {
    serveMigration(ACTIVE);
    render(<MigrationSection />);

    expect(await screen.findByText(/Resolves when the provider is ready/)).toBeInTheDocument();
    // Three items, one without a checkbox: the provider
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('downloads the report as JSON', async () => {
    const created: Blob[] = [];
    const downloads: string[] = [];
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push(this.download);
    });

    URL.createObjectURL = jest.fn((blob: Blob) => {
      created.push(blob);

      return 'blob:report';
    });
    URL.revokeObjectURL = jest.fn();
    serveMigration(ACTIVE);
    const { user } = render(<MigrationSection />);

    await user.click(await screen.findByRole('button', { name: 'Download report' }));

    expect(downloads).toEqual(['end-users-migration-report.json']);
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(created[0]);
    });

    expect(created[0].type).toBe('application/json');
    expect(JSON.parse(text)).toEqual(REPORT);
    click.mockRestore();
  });

  it('shows the legacy-token hits and the migration settings read-only', async () => {
    serveMigration(ACTIVE);
    render(<MigrationSection />);

    expect(await screen.findByText('Legacy token use')).toBeInTheDocument();
    expect(screen.getByText('Legacy tokens').nextSibling).toHaveTextContent('7');
    expect(screen.getByText('Access tokens').nextSibling).toHaveTextContent('31');
    expect(screen.getByText('Last legacy token').nextSibling).toHaveTextContent('Nov 8, 2026');

    expect(screen.getByText('Migration settings')).toBeInTheDocument();
    expect(screen.getByText('keep-oldest')).toBeInTheDocument();
    expect(screen.getByText('displayName')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('is not shown when no migration has run', async () => {
    serveMigration({ ...ACTIVE, record: null, report: null });
    render(<MigrationSection />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('heading', { name: 'Migration' })).not.toBeInTheDocument();
  });
});
