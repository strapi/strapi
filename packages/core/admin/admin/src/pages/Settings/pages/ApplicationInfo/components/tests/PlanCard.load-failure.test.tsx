import { render, screen, waitFor } from '@tests/utils';

import { PlanCard } from '../PlanCard';

// Kept apart from PlanCard.test.tsx because the module mock itself has to fail: a chunk can
// stop loading mid-session (a redeploy replaced the bundle, the connection dropped).
jest.mock(
  '../../../../../../../../ee/admin/src/pages/SettingsPage/pages/ApplicationInfoPage/components/LicenseInfo',
  () => {
    throw new Error('Loading chunk failed');
  }
);

jest.mock('../../../../../../services/admin', () => ({
  useGetLicenseLimitsQuery: () => ({
    data: { data: { licenseStatus: 'active', planPriceId: 'enterprise-plan' } },
  }),
}));

describe('PlanCard when the EE license module fails to load', () => {
  const original = { isEE: window.strapi.isEE, projectType: window.strapi.projectType };

  afterEach(() => {
    window.strapi.isEE = original.isEE;
    window.strapi.projectType = original.projectType;
  });

  it('reports the failure instead of leaving the rejection unhandled, and never shows Community', async () => {
    window.strapi.isEE = true;
    // The Community body prints `projectType`, so it must be Community here for the fallback to
    // be visible if it ever renders.
    window.strapi.projectType = 'Community';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<PlanCard />);

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Loading chunk failed' })
      )
    );
    expect(screen.queryByText(/current plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Community')).not.toBeInTheDocument();

    errorSpy.mockRestore();
  });
});
