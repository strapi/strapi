import { render, screen, waitFor } from '@tests/utils';

import { useGetCurrentSpaceQuery, useGetMineSpacesQuery } from '../../services/spaces';
import { SpaceSwitcher } from '../SpaceSwitcher';

jest.mock('../../services/spaces', () => ({
  useGetMineSpacesQuery: jest.fn(),
  useGetCurrentSpaceQuery: jest.fn(() => ({ data: undefined, isSuccess: true })),
}));

const switchWorkspace = jest.fn();

jest.mock('../../utils/useSwitchWorkspace', () => ({
  useSwitchWorkspace: () => switchWorkspace,
}));

jest.mock('../../utils/useSpaceLimits', () => ({
  useSpaceLimits: () => ({ isAtLimit: false }),
}));

// The switcher attributes the stored slug to an admin, and the test providers
// mount the auth context without a session.
jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useAuth: jest.fn((_consumer: string, selector: (state: unknown) => unknown) =>
    selector({ user: { id: 1 }, token: 'a-session', permissions: [] })
  ),
}));

const DEFAULT = { id: 1, slug: 'default', name: 'Default', color: null };
const ACME = { id: 2, slug: 'acme', name: 'Acme', color: '#EE5E52' };

/** The id `@tests/utils` logs in as. */
const CURRENT_USER = '1';

const store = (slug: string, owner: string | null) => {
  window.localStorage.setItem('strapi-spaces:current-slug', slug);
  if (owner !== null) {
    window.localStorage.setItem('strapi-spaces:current-slug-owner', owner);
  }
};

describe('SpaceSwitcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
    switchWorkspace.mockClear();
    jest.mocked(useGetCurrentSpaceQuery).mockReturnValue({
      data: undefined,
      isSuccess: true,
    } as never);
  });

  it('shows the active workspace', async () => {
    jest.mocked(useGetMineSpacesQuery).mockReturnValue({ data: [DEFAULT] } as never);

    render(<SpaceSwitcher />);

    await waitFor(() => {
      expect(screen.getByText(/Current workspace: Default/)).toBeInTheDocument();
    });
  });

  /**
   * Reachable: archive the only workspace a user's roles are bound to and they
   * are a member of nothing. Every request around them is then refused, so this
   * branch is the only thing on screen that can say why — it must render, and
   * it must not throw.
   */
  it('says so when the admin belongs to no workspace', async () => {
    jest.mocked(useGetMineSpacesQuery).mockReturnValue({ data: [] } as never);

    render(<SpaceSwitcher />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'No workspace: you do not belong to any. Ask an administrator to add you to one.'
        )
      ).toBeInTheDocument();
    });
  });

  it('renders nothing while the workspace list is loading', () => {
    jest.mocked(useGetMineSpacesQuery).mockReturnValue({ data: undefined } as never);

    render(<SpaceSwitcher />);

    expect(screen.queryByText(/Current workspace/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No workspace/)).not.toBeInTheDocument();
  });

  /**
   * The workspace belongs to the admin, not to the browser. Two admins sharing
   * one machine must each land where they themselves left off — the server
   * remembers that per user, and the slug left behind by the previous one names
   * a real workspace, so nothing but the owner marker tells them apart.
   */
  describe('hydration from the server', () => {
    beforeEach(() => {
      jest.mocked(useGetMineSpacesQuery).mockReturnValue({ data: [DEFAULT, ACME] } as never);
      jest.mocked(useGetCurrentSpaceQuery).mockReturnValue({
        data: { slug: 'acme' },
        isSuccess: true,
      } as never);
    });

    it('asks the server when the stored workspace belongs to another admin', async () => {
      store('default', '999');

      render(<SpaceSwitcher />);

      await waitFor(() => {
        expect(switchWorkspace).toHaveBeenCalledWith('acme', expect.anything());
      });
    });

    it('keeps the stored workspace when it is the admin’s own', async () => {
      store('default', CURRENT_USER);

      render(<SpaceSwitcher />);

      await waitFor(() => {
        expect(screen.getByText(/Current workspace: Default/)).toBeInTheDocument();
      });
      expect(switchWorkspace).not.toHaveBeenCalled();
    });

    it('asks the server on a first visit, with nothing stored', async () => {
      render(<SpaceSwitcher />);

      await waitFor(() => {
        expect(switchWorkspace).toHaveBeenCalledWith('acme', expect.anything());
      });
    });
  });
});
