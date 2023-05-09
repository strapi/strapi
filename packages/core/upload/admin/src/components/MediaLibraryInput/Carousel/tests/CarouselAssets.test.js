import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { CarouselAssets } from '../CarouselAssets';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => ({
    toggleNotification: jest.fn(),
  })),
}));

const ASSET_FIXTURES = [
  {
    alternativeText: 'alternative text',
    createdAt: '2021-10-01T08:04:56.326Z',
    ext: '.jpeg',
    formats: {
      thumbnail: {
        url: '/uploads/thumbnail_3874873_b5818bb250.jpg',
      },
    },
    id: 1,
    mime: 'image/jpeg',
    name: 'michka',
    size: 11.79,
    updatedAt: '2021-10-18T08:04:56.326Z',
    url: '/uploads/michka.jpg',
  },
];

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const ComponentFixture = (props) => {
  return (
    <QueryClientProvider client={client}>
      <IntlProvider locale="en" messages={{}}>
        <ThemeProvider theme={lightTheme}>
          <CarouselAssets
            assets={ASSET_FIXTURES}
            label="Carousel"
            onAddAsset={jest.fn}
            onDeleteAsset={jest.fn}
            onDeleteAssetFromMediaLibrary={jest.fn}
            onEditAsset={jest.fn}
            onNext={jest.fn}
            onPrevious={jest.fn}
            selectedAssetIndex={0}
            {...props}
          />
        </ThemeProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

describe('MediaLibraryInput | Carousel | CarouselAssets', () => {
  it('should render empty carousel', () => {
    const { getByText } = setup({ assets: [] });

    expect(
      getByText('Click to add an asset or drag and drop one in this area')
    ).toBeInTheDocument();
  });

  it('should render with an asset', () => {
    const { getByRole } = setup();

    expect(getByRole('img', { name: 'alternative text' })).toBeInTheDocument();
  });

  it('should render actions buttons', () => {
    const { getByRole } = setup();

    expect(getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'edit' })).toBeInTheDocument();
  });

  it('should call onAddAsset', () => {
    const onAddAssetSpy = jest.fn();
    const { getByRole } = setup({ onAddAsset: onAddAssetSpy });

    fireEvent.click(getByRole('button', { name: 'Add' }));

    expect(onAddAssetSpy).toHaveBeenCalledTimes(1);
  });

  it('should call onDeleteAsset', () => {
    const onDeleteAssetSpy = jest.fn();
    const { getByRole } = setup({ onDeleteAsset: onDeleteAssetSpy });

    fireEvent.click(getByRole('button', { name: 'Delete' }));

    expect(onDeleteAssetSpy).toHaveBeenCalledTimes(1);
  });

  it('should open edit view', () => {
    const { getByRole, getByText } = setup();

    fireEvent.click(getByRole('button', { name: 'edit' }));

    expect(getByText('Details')).toBeInTheDocument();
  });

  it('should render the localized label', () => {
    const { getByText } = setup({ labelAction: <div>localized</div> });

    expect(getByText('localized')).toBeInTheDocument();
  });
});
