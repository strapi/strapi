import { render, screen } from '@tests/utils';

import { BetaNotice } from '../BetaNotice';

const STORAGE_KEY = 'STRAPI_UPLOAD_LIBRARY_BETA_NOTICE_DISMISSED';

describe('BetaNotice', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('renders the beta notice by default', async () => {
    render(<BetaNotice />);

    expect(await screen.findByText('Beta')).toBeInTheDocument();
    expect(screen.getByText(/This is a beta version of the Media Library/)).toBeInTheDocument();
  });

  it('hides the notice and persists the choice once dismissed', async () => {
    const { user } = render(<BetaNotice />);

    await user.click(await screen.findByRole('button', { name: 'Close' }));

    expect(
      screen.queryByText(/This is a beta version of the Media Library/)
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('stays hidden when it was dismissed previously', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');

    render(<BetaNotice />);

    expect(
      screen.queryByText(/This is a beta version of the Media Library/)
    ).not.toBeInTheDocument();
  });
});
