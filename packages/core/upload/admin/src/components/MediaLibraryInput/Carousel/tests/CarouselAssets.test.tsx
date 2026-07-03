import { render, waitFor } from '@tests/utils';

import { CarouselAssets } from '../CarouselAssets';

import type { CarouselAssetsProps } from '../CarouselAssets';

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
    hash: 'hash',
  },
];

/**
 * Mock the cropper import to avoid having an error
 */
jest.mock('cropperjs/dist/cropper.css?raw', () => '', {
  virtual: true,
});

const setup = (props?: Partial<CarouselAssetsProps>) =>
  render(
    <CarouselAssets
      assets={ASSET_FIXTURES}
      label="Carousel"
      onAddAsset={jest.fn()}
      onDeleteAsset={jest.fn()}
      onDeleteAssetFromMediaLibrary={jest.fn()}
      onEditAsset={jest.fn()}
      onNext={jest.fn()}
      onPrevious={jest.fn()}
      onDoubleClickAsset={jest.fn()}
      selectedAssetIndex={0}
      {...props}
    />
  );

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

  it('should load a remote thumbnail with crossOrigin="anonymous" (strapi/strapi#26581)', () => {
    const { getByRole } = setup();

    // The same signed URL is also loaded by the preview dialog with
    // crossOrigin="anonymous"; the thumbnail must match so the browser does not
    // cache a no-CORS response and reuse it for the cross-origin preview load.
    expect(getByRole('img', { name: 'alternative text' })).toHaveAttribute(
      'crossorigin',
      'anonymous'
    );
  });

  it('should not set crossOrigin for local assets', () => {
    const { getByRole } = setup({
      assets: [{ ...ASSET_FIXTURES[0], isLocal: true }],
    });

    expect(getByRole('img', { name: 'alternative text' })).not.toHaveAttribute('crossorigin');
  });

  it('should render actions buttons', () => {
    const { getByRole } = setup();

    expect(getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'edit' })).toBeInTheDocument();
  });

  it('should call onAddAsset', async () => {
    const onAddAssetSpy = jest.fn();
    const { getByRole, user } = setup({ onAddAsset: onAddAssetSpy });

    await user.click(getByRole('button', { name: 'Add' }));

    expect(onAddAssetSpy).toHaveBeenCalledTimes(1);
  });

  it('should call onDeleteAsset', async () => {
    const onDeleteAssetSpy = jest.fn();
    const { getByRole, user } = setup({ onDeleteAsset: onDeleteAssetSpy });

    await user.click(getByRole('button', { name: 'Delete' }));

    expect(onDeleteAssetSpy).toHaveBeenCalledTimes(1);
  });

  it('should open edit view', async () => {
    const { getByRole, getByText, user, queryByText } = setup();

    await user.click(getByRole('button', { name: 'edit' }));

    expect(getByText('Details')).toBeInTheDocument();

    await waitFor(() => expect(queryByText('Content is loading.')).not.toBeInTheDocument());
  });

  it('should render the localized label', () => {
    const { getByText } = setup({ labelAction: <div>localized</div> });

    expect(getByText('localized')).toBeInTheDocument();
  });

  it('should not render the edit button if disabled', () => {
    const { queryByRole } = setup({ disabled: true });

    expect(queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
  });

  it('should not open edit view on double click when disabled', async () => {
    const onDoubleClickAssetSpy = jest.fn();
    const { getByRole, queryByText, user } = setup({
      disabled: true,
      onDoubleClickAsset: onDoubleClickAssetSpy,
    });

    await user.dblClick(getByRole('img', { name: 'alternative text' }));

    expect(queryByText('Details')).not.toBeInTheDocument();
    expect(onDoubleClickAssetSpy).not.toHaveBeenCalled();
  });
});
