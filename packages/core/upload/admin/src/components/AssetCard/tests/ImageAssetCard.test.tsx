import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderTL, screen } from '@testing-library/react';

import en from '../../../translations/en.json';
import { ImageAssetCard } from '../ImageAssetCard';

jest.mock('../../../utils/index', () => ({
  ...jest.requireActual('../../../utils/index'),
  getTrad: (x: string) => x,
  appendSearchParamsToUrl: jest.fn((obj) => obj.url), // Mock to return just the URL
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }: { id: keyof typeof en }) => en[id]) }),
}));

describe('ImageAssetCard', () => {
  it('renders the component with correct data', () => {
    const onEditMock = jest.fn();
    const onSelectMock = jest.fn();

    renderTL(
      <DesignSystemProvider>
        <ImageAssetCard
          alt="Alternative text"
          name="hello.png"
          extension="png"
          height={40}
          width={40}
          thumbnail="http://somewhere.com/hello.png"
          selected={false}
          onSelect={onSelectMock}
          onEdit={onEditMock}
          isUrlSigned={false}
        />
      </DesignSystemProvider>
    );

    // Check for the filename
    expect(screen.getByText('hello.png')).toBeInTheDocument();

    // Check for the file extension (lowercase)
    expect(screen.getByText('png')).toBeInTheDocument();

    // Check for the image dimensions
    expect(screen.getByText('- 40✕40')).toBeInTheDocument();

    // Check for image badge/label
    expect(screen.getByText('Image')).toBeInTheDocument();

    // Check for the image element
    const image = screen.getByAltText('Alternative text');
    expect(image).toHaveAttribute('src', 'http://somewhere.com/hello.png');
    expect(image).toHaveAttribute('alt', 'Alternative text');
  });

  it('renders with signed URL when isUrlSigned is true', () => {
    renderTL(
      <DesignSystemProvider>
        <ImageAssetCard
          alt="Alternative text"
          name="hello.png"
          extension="png"
          thumbnail="http://somewhere.com/hello.png?token=xyz"
          selected={false}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          isUrlSigned={true}
        />
      </DesignSystemProvider>
    );

    // Check that the URL is used directly without modification when signed
    const image = screen.getByAltText('Alternative text');
    expect(image).toHaveAttribute('src', 'http://somewhere.com/hello.png?token=xyz');
  });

  it('shows selected state when selected', () => {
    renderTL(
      <DesignSystemProvider>
        <ImageAssetCard
          alt="Alternative text"
          name="hello.png"
          extension="png"
          thumbnail="http://somewhere.com/hello.png"
          selected={true}
          isSelectable={true}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          isUrlSigned={false}
        />
      </DesignSystemProvider>
    );

    // Check for the checkbox to be checked when selected
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });
});
