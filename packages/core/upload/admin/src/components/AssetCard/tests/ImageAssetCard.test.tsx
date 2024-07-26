import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';

import en from '../../../translations/en.json';
import { ImageAssetCard } from '../ImageAssetCard';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: (x: string) => x,
}));

type Messages = typeof en;

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }: { id: keyof Messages }) => en[id]) }),
}));

describe('ImageAssetCard', () => {
  it('renders the component with the correct infos', () => {
    const { getByRole } = renderTL(
      <DesignSystemProvider>
        <ImageAssetCard
          alt=""
          name="hello.png"
          extension="png"
          height={40}
          width={40}
          thumbnail="http://somewhere.com/hello.png"
          selected={false}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          isUrlSigned={false}
        />
      </DesignSystemProvider>
    );

    // Get the heading of the card
    const headingElement = getByRole('heading', { name: 'hello.png' });
    expect(headingElement).toBeInTheDocument();
  });
});
