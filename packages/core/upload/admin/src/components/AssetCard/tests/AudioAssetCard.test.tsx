import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderTL, screen } from '@testing-library/react';

import en from '../../../translations/en.json';
import { AudioAssetCard } from '../AudioAssetCard';

type Messages = typeof en;

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }: { id: keyof Messages }) => en[id]) }),
}));

describe('AudioAssetCard', () => {
  it('renders the component with the correct infos', () => {
    renderTL(
      <DesignSystemProvider>
        <AudioAssetCard
          name="hello.mp3"
          extension="mp3"
          url="https://example.com/audio.mp3"
          selected={false}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          size="S"
        />
      </DesignSystemProvider>
    );

    // Get the heading of the card
    const headingElement = screen.getByRole('heading', { name: 'hello.mp3' });
    expect(headingElement).toBeInTheDocument();
  });
});
