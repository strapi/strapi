import { render, screen } from '@tests/utils';
import { ACTIVE, CHECK, serveMigration } from '@tests/migrationFixtures';

import { CheckModeNotice } from '../CheckModeNotice';

describe('CheckModeNotice', () => {
  it('shows only the migration page in check mode', async () => {
    serveMigration(CHECK);
    render(
      <CheckModeNotice>
        <p>Page content</p>
      </CheckModeNotice>
    );

    expect(
      await screen.findByText('End users turns on when the migration runs')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the migration check' })).toHaveAttribute(
      'href',
      '/settings/end-users/advanced#migration'
    );
    expect(screen.queryByText('Page content')).not.toBeInTheDocument();
  });

  it('shows the page itself outside check mode', async () => {
    serveMigration(ACTIVE);
    render(
      <CheckModeNotice>
        <p>Page content</p>
      </CheckModeNotice>
    );

    expect(await screen.findByText('Page content')).toBeInTheDocument();
    expect(screen.queryByText(/turns on when/)).not.toBeInTheDocument();
  });
});
