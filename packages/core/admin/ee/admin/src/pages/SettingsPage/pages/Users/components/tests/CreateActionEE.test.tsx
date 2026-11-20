import { render } from '@tests/utils';

import { useLicenseLimits } from '../../../../../../hooks/useLicenseLimits';
import { CreateActionEE } from '../CreateActionEE';

jest.mock('../../../../../../hooks/useLicenseLimits');

const mockLicense = (license: Record<string, unknown>) => {
  // @ts-expect-error – mocked
  useLicenseLimits.mockReturnValue({
    isLoading: false,
    isError: false,
    license: {
      licenseStatus: 'active',
      type: 'gold',
      planPriceId: 'Strapi-Enterprise-Platform-Tier-1-USD-Yearly',
      permittedSeats: 3,
      shouldStopCreate: true,
      ...license,
    },
  });
};

describe('<CreateActionEE />', () => {
  test('disables the invite button at the limit', () => {
    mockLicense({});

    const { getByRole } = render(<CreateActionEE />);

    expect(getByRole('button', { name: 'Invite new user' })).toBeDisabled();
  });

  test.each([
    ['a Growth plan', 'growth-v2-USD-Monthly', 'Remove a user or manage your seats.'],
    [
      'an Enterprise plan',
      'Strapi-Enterprise-Platform-Tier-1-USD-Yearly',
      'Remove a user or contact sales.',
    ],
  ])('tells %s what to do at the limit', async (_label, planPriceId, advice) => {
    mockLicense({ planPriceId });

    const { getAllByText, user, findByRole } = render(<CreateActionEE />);

    // The warning icon, the tooltip trigger, comes before the button's mail icon
    const [warningIcon] = getAllByText((_, element) => element?.tagName.toLowerCase() === 'svg');
    await user.hover(warningIcon);

    expect(await findByRole('tooltip')).toHaveTextContent(
      `Your license user limit is reached. ${advice}`
    );
  });
});
