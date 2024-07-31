import { useAppInfo } from '@strapi/helper-plugin';
import { render } from '@tests/utils';

import { Onboarding } from '../Onboarding';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useAppInfo: jest.fn(() => ({ communityEdition: true })),
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
    useAppInfo.mockImplementation(() => ({ communityEdition: false }));
    const { getByRole, user } = render(<Onboarding />);

    await user.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://support.strapi.io/support/home'
    );
  });
});
