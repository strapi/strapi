import { DesignSystemProvider, Modal } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { AssetType } from '../../../../constants';
import { PendingAssetStep } from '../PendingAssetStep';

jest.mock('../../../../utils', () => ({
  ...jest.requireActual('../../../../utils'),
  getTrad: (x: string) => x,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

describe('PendingAssetStep', () => {
  beforeAll(() => {
    // see https://github.com/testing-library/react-testing-library/issues/470
    Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
      set() {},
    });
  });

  it('snapshots the component with valid cards', () => {
    const assets = [
      {
        source: 'url',
        type: AssetType.Image,
        url: 'http://localhost:5000/CPAM.jpg',
        ext: 'jpg',
        mime: 'image/jpeg',
        alt: '',
        name: 'something.jpg',
        id: 1,
        hash: 'hash_1',
      },
      {
        source: 'url',
        type: AssetType.Document,
        url: 'http://localhost:5000/MARIAGE%20FRACHET%204.pdf',
        ext: 'pdf',
        mime: 'application/pdf',
        name: 'something.pdf',
        id: 2,
        hash: 'hash_2',
      },
      {
        source: 'url',
        type: AssetType.Video,
        url: 'http://localhost:5000/mov_bbb.mp4',
        ext: 'mp4',
        mime: 'video/mp4',
        alt: '',
        name: 'something.mp4',
        id: 3,
        hash: 'hash_3',
      },
    ];

    const { container } = renderTL(
      <QueryClientProvider client={queryClient}>
        <DesignSystemProvider>
          <IntlProvider locale="en">
            <Modal.Root open>
              <Modal.Content>
                <PendingAssetStep
                  assets={assets}
                  onClose={jest.fn()}
                  onAddAsset={jest.fn()}
                  onEditAsset={jest.fn()}
                  onClickAddAsset={jest.fn()}
                  onCancelUpload={jest.fn()}
                  onRemoveAsset={jest.fn()}
                  onUploadSucceed={jest.fn()}
                />
              </Modal.Content>
            </Modal.Root>
          </IntlProvider>
        </DesignSystemProvider>
      </QueryClientProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
