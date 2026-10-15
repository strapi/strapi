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
    expect(screen.queryByText(/releases behind/)).not.toBeInTheDocument();
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
        screen.getByText(
          "You're on v5.9.0. Upgrade to get the latest features, fixes and security patches."
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Update available')).toBeInTheDocument();

      const whatsNew = screen.getByRole('link', { name: /What's new/ });
      expect(whatsNew).toHaveAttribute('href', RELEASES_URL);
      expect(whatsNew).toHaveAttribute('target', '_blank');
      expect(whatsNew).toHaveAttribute('rel', expect.stringMatching(/noopener/));
      expect(whatsNew).toHaveAttribute('rel', expect.stringMatching(/noreferrer/));

      const howToUpgrade = screen.getByRole('link', { name: /How to upgrade/ });
      expect(howToUpgrade).toHaveAttribute('href', UPGRADE_DOCS_URL);
      expect(howToUpgrade).toHaveAttribute('target', '_blank');
      expect(UPGRADE_DOCS_URL).toContain('utm_source=admin-panel');

      expect(screen.getByRole('button', { name: 'Dismiss for this version' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remind me later' })).not.toBeInTheDocument();
    });

    it('stays the default state when exactly 10 releases behind', async () => {
      renderPage('5.0.0', 'v5.10.0');

      expect(await screen.findByText('Strapi v5.10.0 is available')).toBeInTheDocument();
    });

    it('dismisses the banner for the current latest version only', async () => {
      const { user, unmount } = renderPage('5.9.0', 'v5.10.0');

      await user.click(await screen.findByRole('button', { name: 'Dismiss for this version' }));

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
    it('shows the urgent banner, links and version badge when 11 releases behind', async () => {
      renderPage('5.0.0', 'v5.11.0');

      expect(
        await screen.findByText('Your Strapi version is 11 releases behind')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "You're on v5.0.0 and missing fixes and security patches shipped since. Upgrade to v5.11.0 as soon as you can."
        )
      ).toBeInTheDocument();
      expect(screen.getByText('11 releases behind')).toBeInTheDocument();
      expect(screen.queryByText('Update available')).not.toBeInTheDocument();

      expect(screen.getByRole('link', { name: /What's new/ })).toHaveAttribute(
        'href',
        RELEASES_URL
      );
      const upgradeNow = screen.getByRole('link', { name: /Upgrade now/ });
      expect(upgradeNow).toHaveAttribute('href', UPGRADE_DOCS_URL);
      expect(upgradeNow).toHaveAttribute('target', '_blank');
      expect(upgradeNow).toHaveAttribute('rel', 'noopener noreferrer');

      expect(screen.getByRole('button', { name: 'Remind me later' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Dismiss for this version' })
      ).not.toBeInTheDocument();
    });

    it('uses a dedicated title when on an older major', async () => {
      renderPage('4.25.0', 'v5.2.0');

      expect(
        await screen.findByText("You're on Strapi 4, version 5 is available")
      ).toBeInTheDocument();
      expect(screen.getByText('Major update available')).toBeInTheDocument();
    });

    it('hides the banner for 7 days with "Remind me later"', async () => {
      const now = new Date('2026-10-15T10:00:00Z').getTime();
      jest.useFakeTimers({ now, advanceTimers: true });

      const { user, unmount } = renderPage('5.0.0', 'v5.11.0');

      await user.click(await screen.findByRole('button', { name: 'Remind me later' }));

      expect(
        screen.queryByText('Your Strapi version is 11 releases behind')
      ).not.toBeInTheDocument();
      const remindLaterAt = Number(
        window.localStorage.getItem(`${REMIND_LATER_AT_KEY}:${PROJECT_UUID}`)
      );
      expect(remindLaterAt).toBeGreaterThanOrEqual(now);

      unmount();

      // Still hidden just before 7 days
      jest.setSystemTime(remindLaterAt + REMIND_LATER_DELAY_MS - 60 * 1000);
      const { unmount: unmountBefore } = renderPage('5.0.0', 'v5.11.0');
      await screen.findByText('11 releases behind');
      expect(
        screen.queryByText('Your Strapi version is 11 releases behind')
      ).not.toBeInTheDocument();
      unmountBefore();

      // Back after 7 days
      jest.setSystemTime(remindLaterAt + REMIND_LATER_DELAY_MS);
      renderPage('5.0.0', 'v5.11.0');
      expect(
        await screen.findByText('Your Strapi version is 11 releases behind')
      ).toBeInTheDocument();
    });
  });

  describe('dismiss scope', () => {
    it('keeps a dismissal to the project that made it', async () => {
      const { user, unmount } = renderPage('5.9.0', 'v5.10.0');

      await user.click(await screen.findByRole('button', { name: 'Dismiss for this version' }));
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
  });

  it('keeps working when localStorage is unavailable', async () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    const { user } = renderPage('5.9.0', 'v5.10.0');

    await user.click(await screen.findByRole('button', { name: 'Dismiss for this version' }));
    expect(screen.queryByText('Strapi v5.10.0 is available')).not.toBeInTheDocument();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
