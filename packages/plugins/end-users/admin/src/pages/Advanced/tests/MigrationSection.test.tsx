import { ACTIVE, CHECK, REPORT, serveMigration } from '@tests/migrationFixtures';
import { answered, render, screen, server, waitFor } from '@tests/utils';
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

  it('offers to run the check until one exists, and says one minute in the singular', async () => {
    serveMigration({ ...CHECK, report: null });
    const { unmount } = render(<MigrationSection />);

    expect(await screen.findByRole('button', { name: 'Run the check' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check again' })).not.toBeInTheDocument();

    unmount();
    serveMigration({
      ...CHECK,
      report: { ...CHECK.report!, estimate: { client: 'sqlite', minutes: 1 } },
    });
    render(<MigrationSection />);

    expect(await screen.findByText('1 minute')).toBeInTheDocument();
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

    // Only an Action item can be ticked: the API token item is Info, and has nothing to resolve
    const boxes = screen.getAllByRole('checkbox', { name: 'Mark resolved' });

    expect(boxes).toHaveLength(1);
    expect(boxes[0]).not.toBeChecked();
    // A resolved item says so on its badge, and an open one keeps its kind
    // (the column heading is the other)
    expect(screen.getAllByText('Resolved')).toHaveLength(2);
    expect(screen.getAllByText('Action')).toHaveLength(2);

    await user.click(boxes[0]);

    await waitFor(() =>
      expect(sent).toEqual([{ id: 'role-renamed:author', body: { resolved: true } }])
    );
  });

  it('shows what resolves a provider that needs input instead of a checkbox', async () => {
    serveMigration(ACTIVE);
    render(<MigrationSection />);

    expect(await screen.findByText(/Resolves when the provider is ready/)).toBeInTheDocument();
    // Three items: the role one is ticked by hand, the provider resolves itself, the Info one has no box
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
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
    expect(screen.getByText('Legacy tokens')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('Last legacy token')).toBeInTheDocument();

    expect(screen.getByText('Migration settings')).toBeInTheDocument();
    expect(screen.getByText('Keep the oldest')).toBeInTheDocument();
    expect(screen.getByText('displayName')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('is not shown when no migration has run', async () => {
    serveMigration({ ...ACTIVE, record: null, report: null });
    const statusRead = answered('/end-users/migration');

    render(<MigrationSection />);

    await statusRead();
    expect(screen.queryByRole('heading', { name: 'Migration' })).not.toBeInTheDocument();
  });
});
