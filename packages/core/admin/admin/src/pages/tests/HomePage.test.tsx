import { render } from '@tests/utils';

import { useAppInfo } from '../../features/AppInfo';
import { useContentTypes } from '../../hooks/useContentTypes';
import { HomePage } from '../HomePage';

jest.mock('../../features/AppInfo', () => ({
  ...jest.requireActual('../../features/AppInfo'),
  useAppInfo: jest.fn((name, getter) => getter({ communityEdition: true })),
}));

/**
 * TODO: remove this mock.
 */
jest.mock('../../hooks/useContentTypes');

describe('Homepage', () => {
  test('should render all homepage links', () => {
    const { getByRole } = render(<HomePage />);
    expect(getByRole('link', { name: /we are hiring/i })).toBeInTheDocument();
  });

  test.each([
    'strapi cloud fully-managed cloud hosting for your strapi project.',
    'documentation discover the essential concepts, guides and instructions.',
    'code example learn by using ready-made starters for your projects.',
    'tutorials follow step-by-step instructions to use and customize strapi.',
    'blog read the latest news about strapi and the ecosystem.',
    'see our road map',
    'github',
    'discord',
    'reddit',
    'twitter',
    'forum',
    'we are hiring',
  ])('should display %s link', (link) => {
    const { getByRole } = render(<HomePage />);

    expect(getByRole('link', { name: new RegExp(link, 'i') })).toBeInTheDocument();
  });

  test('should display discord link for CE edition', () => {
    const { getByRole } = render(<HomePage />);

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://discord.strapi.io'
    );
  });

  test('should display support link for EE edition', () => {
    // @ts-expect-error - mock implementation
    useAppInfo.mockImplementation((name, getter) => getter({ communityEdition: false }));
    const { getByRole } = render(<HomePage />);

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://support.strapi.io/support/home'
    );
  });

  it('should display particular text and action when there are no collectionTypes and singletypes', () => {
    const { getByText, getByRole } = render(<HomePage />);

    expect(
      getByText(
        'Congrats! You are logged as the first administrator. To discover the powerful features provided by Strapi, we recommend you to create your first Content type!'
      )
    ).toBeInTheDocument();
    expect(getByRole('button', { name: 'Create your first Content type' })).toBeInTheDocument();
  });

  it('should display particular text and action when there are collectionTypes and singletypes', () => {
    jest.mocked(useContentTypes).mockReturnValue({
      isLoading: false,
      // @ts-expect-error - mock implementation
      collectionTypes: [{ uuid: 102 }],
      // @ts-expect-error - mock implementation
      singleTypes: [{ isDisplayed: true }],
    });

    const { getByText, getByRole } = render(<HomePage />);

    expect(
      getByText(
        'We hope you are making progress on your project! Feel free to read the latest news about Strapi. We are giving our best to improve the product based on your feedback.'
      )
    ).toBeInTheDocument();
    expect(getByRole('link', { name: 'See more on the blog' })).toBeInTheDocument();
  });
});
