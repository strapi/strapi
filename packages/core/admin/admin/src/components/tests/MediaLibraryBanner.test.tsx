import { render, screen } from '@tests/utils';

import { MediaLibraryBanner } from '../MediaLibraryBanner';

jest.mock('../../../src/services/admin', () => ({
  useInitQuery: jest.fn(() => ({
    data: {
      uuid: 'test-uuid',
    },
  })),
}));

const KEY_OFF = 'STRAPI_MEDIA_LIBRARY_BANNER_DISMISSED_FOR_false:test-uuid';
const KEY_ON = 'STRAPI_MEDIA_LIBRARY_BANNER_DISMISSED_FOR_true:test-uuid';

// The banner only makes sense on the Media Library itself; render it there by default
// and let the dedicated "other pages" test cover the rest of the admin.
const renderOnMediaLibrary = (ui: Parameters<typeof render>[0]) =>
  render(ui, { initialEntries: ['/plugins/upload'] });

describe('MediaLibraryBanner', () => {
  beforeEach(() => {
    localStorage.removeItem(KEY_OFF);
    localStorage.removeItem(KEY_ON);
    window.strapi.featureFlags.isEnabled = jest.fn(() => false);
  });

  it('should not render outside of the Media Library pages', () => {
    render(<MediaLibraryBanner />, { initialEntries: ['/content-manager'] });

    expect(screen.queryByText('Introducing the new Media Library')).not.toBeInTheDocument();
  });

  it('should render on the legacy Media Library configuration page too', () => {
    render(<MediaLibraryBanner />, { initialEntries: ['/plugins/upload/configuration'] });

    expect(screen.getByText('Introducing the new Media Library')).toBeInTheDocument();
  });

  it('should point the user to the blog post when not on the legacy Media Library', () => {
    renderOnMediaLibrary(<MediaLibraryBanner />);

    expect(screen.getByText('Introducing the new Media Library')).toBeInTheDocument();
    expect(screen.getByText("You're now using the revamped version.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read blog post' })).toHaveAttribute(
      'href',
      'https://strapi.io/blog/strapi-release-roundup-everything-that-changed-between-june-and-august-2026'
    );
    expect(screen.getByRole('link', { name: 'Read blog post' })).toHaveAttribute(
      'target',
      '_blank'
    );
    expect(screen.queryByRole('link', { name: 'Docs' })).not.toBeInTheDocument();
  });

  it('should point the user to the docs when on the legacy Media Library', () => {
    window.strapi.featureFlags.isEnabled = jest.fn(() => true);

    renderOnMediaLibrary(<MediaLibraryBanner />);

    expect(screen.getByText('Introducing the new Media Library')).toBeInTheDocument();
    expect(
      screen.getByText('Check the documentation to learn how to switch to the new one.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      'https://docs.strapi.io/cms/features/media-library'
    );
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('link', { name: 'Read blog post' })).not.toBeInTheDocument();
  });

  it('should leave nothing behind when the close button is clicked', async () => {
    const { user } = renderOnMediaLibrary(<MediaLibraryBanner />);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('Introducing the new Media Library')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should stay dismissed after a remount', async () => {
    const { unmount, user } = renderOnMediaLibrary(<MediaLibraryBanner />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    unmount();

    renderOnMediaLibrary(<MediaLibraryBanner />);

    expect(screen.queryByText('Introducing the new Media Library')).not.toBeInTheDocument();
  });

  it('should re-show the banner with the new message when the flag toggles after a dismissal', async () => {
    const { user } = renderOnMediaLibrary(<MediaLibraryBanner />);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    window.strapi.featureFlags.isEnabled = jest.fn(() => true);

    renderOnMediaLibrary(<MediaLibraryBanner />);

    expect(
      screen.getByText('Check the documentation to learn how to switch to the new one.')
    ).toBeInTheDocument();
  });

  it('should show the banner again after the dismissal key is cleared from storage', async () => {
    const { unmount, user } = renderOnMediaLibrary(<MediaLibraryBanner />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    unmount();

    localStorage.removeItem(KEY_OFF);
    renderOnMediaLibrary(<MediaLibraryBanner />);

    expect(screen.getByText('Introducing the new Media Library')).toBeInTheDocument();
  });

  it('should show the banner again if the dismissal value is reset to a falsy default', () => {
    // Regression: dismissal used to be stored as the flag's own boolean value,
    // so resetting it to `false` (a natural "clear this field" value) while the
    // flag was off looked identical to "dismissed" and the banner stayed hidden
    // forever. Dismissal is now always a plain boolean, so any falsy reset works.
    localStorage.setItem(KEY_OFF, 'false');

    renderOnMediaLibrary(<MediaLibraryBanner />);

    expect(screen.getByText('Introducing the new Media Library')).toBeInTheDocument();
  });
});
