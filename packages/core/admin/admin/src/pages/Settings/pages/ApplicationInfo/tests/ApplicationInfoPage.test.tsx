import { render, screen } from '@tests/utils';

import { AppInfoProvider, AppInfoContextValue } from '../../../../../features/AppInfo';
import { getStrapiUpdateInfo } from '../../../../../utils/strapiUpdate';
import { ApplicationInfoPage } from '../ApplicationInfoPage';
import { RELEASES_URL, UPGRADE_DOCS_URL } from '../components/UpgradeBanner';
import {
  DISMISSED_VERSION_KEY,
  REMIND_LATER_AT_KEY,
  REMIND_LATER_DELAY_MS,
} from '../utils/upgradeBannerStorage';

const PROJECT_UUID = 'project-uuid';

let mockScope: string | false | undefined = PROJECT_UUID;

jest.mock('../../../../../hooks/usePersistentState', () => ({
  ...jest.requireActual('../../../../../hooks/usePersistentState'),
  usePersistentStateScope: () => mockScope,
}));

// The plan and support cards fetch their own data and are covered by their own tests.
jest.mock('../components/PlanCard', () => ({ PlanCard: () => null }));
jest.mock('../components/SupportCard', () => ({ SupportCard: () => null }));

const renderPage = (strapiVersion: string, latestStrapiReleaseTag: string) => {
  const { severity, releasesBehind, isMajorBehind } = getStrapiUpdateInfo(
    strapiVersion,
    latestStrapiReleaseTag
  );

  const appInfo: AppInfoContextValue = {
    strapiVersion,
    latestStrapiReleaseTag,
    nodeVersion: 'v22.0.0',
    shouldUpdateStrapi: severity !== 'none',
    strapiUpdateSeverity: severity,
    strapiReleasesBehind: releasesBehind,
    isStrapiMajorBehind: isMajorBehind,
  };

  return render(
    <AppInfoProvider {...appInfo}>
      <ApplicationInfoPage />
    </AppInfoProvider>
  );
};

describe('ApplicationInfoPage – upgrade banner', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockScope = PROJECT_UUID;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows nothing when Strapi is up to date', async () => {
    renderPage('5.10.0', 'v5.10.0');

    await screen.findByRole('heading', { name: 'Overview' });

    expect(screen.queryByText(/is available/)).not.toBeInTheDocument();
    expect(screen.queryByText(/minor versions behind/)).not.toBeInTheDocument();
    expect(screen.queryByText('Update available')).not.toBeInTheDocument();
  });

  it('no longer renders the "Upgrade your admin panel" link', async () => {
    renderPage('5.9.0', 'v5.10.0');

    await screen.findByText('Strapi v5.10.0 is available');

    expect(screen.queryByText('Upgrade your admin panel')).not.toBeInTheDocument();
  });

  describe('default state', () => {
    it('shows the default banner, links and version badge', async () => {
      renderPage('5.9.0', 'v5.10.0');

      expect(await screen.findByText('Strapi v5.10.0 is available')).toBeInTheDocument();
      expect(
        screen.getByText('You are on v5.9.0. Upgrade to get the latest features and fixes.')
      ).toBeInTheDocument();
      expect(screen.getByText('Update available')).toBeInTheDocument();

      const releaseNotes = screen.getByRole('link', { name: /Release notes/ });
      expect(releaseNotes).toHaveAttribute('href', RELEASES_URL);
      expect(releaseNotes).toHaveAttribute('target', '_blank');
      expect(releaseNotes).toHaveAttribute('rel', expect.stringMatching(/noopener/));
      expect(releaseNotes).toHaveAttribute('rel', expect.stringMatching(/noreferrer/));

      const upgradeGuide = screen.getByRole('link', { name: /Upgrade guide/ });
      expect(upgradeGuide).toHaveAttribute('href', UPGRADE_DOCS_URL);
      expect(upgradeGuide).toHaveAttribute('target', '_blank');
      expect(UPGRADE_DOCS_URL).toContain('utm_source=admin-panel');

      expect(
        screen.getByRole('button', { name: 'Hide until the next version' })
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Hide for 7 days' })).not.toBeInTheDocument();
    });

    it('stays the default state when exactly 10 minor versions behind', async () => {
      renderPage('5.0.0', 'v5.10.0');

      expect(await screen.findByText('Strapi v5.10.0 is available')).toBeInTheDocument();
    });

    it('dismisses the banner for the current latest version only', async () => {
      const { user, unmount } = renderPage('5.9.0', 'v5.10.0');

      await user.click(await screen.findByRole('button', { name: 'Hide until the next version' }));

      expect(screen.queryByText('Strapi v5.10.0 is available')).not.toBeInTheDocument();
      expect(window.localStorage.getItem(`${DISMISSED_VERSION_KEY}:${PROJECT_UUID}`)).toBe(
        'v5.10.0'
      );
      // The version badge in the Details card is not dismissible
      expect(screen.getByText('Update available')).toBeInTheDocument();

      unmount();

      renderPage('5.9.0', 'v5.10.0');
      await screen.findByText('Update available');
      expect(screen.queryByText('Strapi v5.10.0 is available')).not.toBeInTheDocument();
    });

    it('shows the banner again when a newer version comes out', async () => {
      window.localStorage.setItem(`${DISMISSED_VERSION_KEY}:${PROJECT_UUID}`, 'v5.10.0');

      renderPage('5.9.0', 'v5.11.0');

      expect(await screen.findByText('Strapi v5.11.0 is available')).toBeInTheDocument();
    });
  });

  describe('urgent state', () => {
    it('shows the urgent banner, links and version badge when 11 minor versions behind', async () => {
      renderPage('5.0.0', 'v5.11.0');

      expect(
        await screen.findByText('Your Strapi version is 11 minor versions behind')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'You are on v5.0.0 and missing the fixes released since. Upgrade to v5.11.0 as soon as you can.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('11 minor versions behind')).toBeInTheDocument();
      expect(screen.queryByText('Update available')).not.toBeInTheDocument();

      expect(screen.getByRole('link', { name: /Release notes/ })).toHaveAttribute(
        'href',
        RELEASES_URL
      );
      const upgradeGuide = screen.getByRole('link', { name: /Upgrade guide/ });
      expect(upgradeGuide).toHaveAttribute('href', UPGRADE_DOCS_URL);
      expect(upgradeGuide).toHaveAttribute('target', '_blank');
      expect(upgradeGuide).toHaveAttribute('rel', 'noopener noreferrer');

      expect(screen.getByRole('button', { name: 'Hide for 7 days' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Hide until the next version' })
      ).not.toBeInTheDocument();
    });

    it('uses a dedicated title when on an older major', async () => {
      renderPage('4.25.0', 'v5.2.0');

      expect(await screen.findByText('Strapi 5 is available')).toBeInTheDocument();
      expect(screen.getByText('Major update available')).toBeInTheDocument();
    });

    it('hides the banner for 7 days with "Hide for 7 days"', async () => {
      const now = new Date('2026-10-15T10:00:00Z').getTime();
      jest.useFakeTimers({ now, advanceTimers: true });

      const { user, unmount } = renderPage('5.0.0', 'v5.11.0');

      await user.click(await screen.findByRole('button', { name: 'Hide for 7 days' }));

      expect(
        screen.queryByText('Your Strapi version is 11 minor versions behind')
      ).not.toBeInTheDocument();
      const remindLaterAt = Number(
        window.localStorage.getItem(`${REMIND_LATER_AT_KEY}:${PROJECT_UUID}`)
      );
      expect(remindLaterAt).toBeGreaterThanOrEqual(now);

      unmount();

      // Still hidden just before 7 days
      jest.setSystemTime(remindLaterAt + REMIND_LATER_DELAY_MS - 60 * 1000);
      const { unmount: unmountBefore } = renderPage('5.0.0', 'v5.11.0');
      await screen.findByText('11 minor versions behind');
      expect(
        screen.queryByText('Your Strapi version is 11 minor versions behind')
      ).not.toBeInTheDocument();
      unmountBefore();

      // Back after 7 days
      jest.setSystemTime(remindLaterAt + REMIND_LATER_DELAY_MS);
      renderPage('5.0.0', 'v5.11.0');
      expect(
        await screen.findByText('Your Strapi version is 11 minor versions behind')
      ).toBeInTheDocument();
    });
  });

  describe('dismiss scope', () => {
    it('keeps a dismissal to the project that made it', async () => {
      const { user, unmount } = renderPage('5.9.0', 'v5.10.0');

      await user.click(await screen.findByRole('button', { name: 'Hide until the next version' }));
      unmount();

      mockScope = 'other-project-uuid';
      renderPage('5.9.0', 'v5.10.0');

      expect(await screen.findByText('Strapi v5.10.0 is available')).toBeInTheDocument();
    });

    it('waits for the instance ID before showing the banner', async () => {
      mockScope = undefined;
      renderPage('5.9.0', 'v5.10.0');

      await screen.findByText('Update available');
      expect(screen.queryByText('Strapi v5.10.0 is available')).not.toBeInTheDocument();
    });

    it('shows the banner and persists dismissals when the instance has no UUID', async () => {
      mockScope = false;
      const { user, unmount } = renderPage('5.9.0', 'v5.10.0');

      await user.click(await screen.findByRole('button', { name: 'Hide until the next version' }));
      expect(window.localStorage.getItem(`${DISMISSED_VERSION_KEY}:false`)).toBe('v5.10.0');
      unmount();

      renderPage('5.9.0', 'v5.10.0');

      await screen.findByText('Update available');
      expect(screen.queryByText('Strapi v5.10.0 is available')).not.toBeInTheDocument();
    });
  });

  it('keeps working when localStorage is unavailable', async () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    const { user } = renderPage('5.9.0', 'v5.10.0');

    await user.click(await screen.findByRole('button', { name: 'Hide until the next version' }));
    expect(screen.queryByText('Strapi v5.10.0 is available')).not.toBeInTheDocument();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
