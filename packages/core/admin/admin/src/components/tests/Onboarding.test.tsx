import { render } from '@tests/utils';

import { useAppInfo } from '../../features/AppInfo';
import { Onboarding } from '../Onboarding';

jest.mock('../../features/AppInfo', () => ({
  ...jest.requireActual('../../features/AppInfo'),
  useAppInfo: jest.fn((name, getter) => getter({ communityEdition: true })),
}));

describe('Onboarding', () => {
  test.each([
    'watch more videos',
    'build a content architecture',
    'add & manage content',
    'manage media',
    'documentation',
    'cheatsheet',
    'get help',
  ])('should display %s link', async (link) => {
    const { getByRole, user } = render(<Onboarding />);

    await user.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: new RegExp(link, 'i') })).toBeInTheDocument();
  });

  test('should display discord link for CE edition', async () => {
    const { getByRole, user } = render(<Onboarding />);

    await user.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://discord.strapi.io'
    );
  });

  test('should display support link for EE edition', async () => {
    // @ts-expect-error - mock
    useAppInfo.mockImplementation((name, getter) => getter({ communityEdition: false }));
    const { getByRole, user } = render(<Onboarding />);

    await user.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://support.strapi.io/support/home'
    );
  });
});
