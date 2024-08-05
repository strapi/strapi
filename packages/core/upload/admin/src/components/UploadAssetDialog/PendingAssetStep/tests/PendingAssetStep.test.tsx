import React from 'react';

import { DesignSystemProvider, Modal } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

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
        id: 1,
        documentId: 'document1',
        name: 'strapi-cover_1fabc982ce.png',
        alternativeText: '',
        caption: '',
        width: 1066,
        height: 551,
        folder: null,
        type: 'images',
        isSelectable: true,
        isLocal: true,
        allowedTypes: ['images', 'files', 'videos', 'audios'],
        formats: {
          thumbnail: {
            name: 'thumbnail_strapi-cover_1fabc982ce.png',
            hash: 'thumbnail_strapi_cover_1fabc982ce_5b43615ed5',
            ext: '.png',
            mime: 'image/png',
            width: 245,
            height: 127,
            size: 3.37,
            path: null,
            sizeInBytes: 3370,
            url: '/uploads/thumbnail_strapi_cover_1fabc982ce_5b43615ed5.png',
          },
          large: {
            name: 'large_strapi-cover_1fabc982ce.png',
            hash: 'large_strapi_cover_1fabc982ce_5b43615ed5',
            ext: '.png',
            mime: 'image/png',
            width: 1000,
            height: 517,
            size: 22.43,
            sizeInBytes: 22430,
            path: null,
            url: '/uploads/large_strapi_cover_1fabc982ce_5b43615ed5.png',
          },
          medium: {
            name: 'medium_strapi-cover_1fabc982ce.png',
            hash: 'medium_strapi_cover_1fabc982ce_5b43615ed5',
            ext: '.png',
            mime: 'image/png',
            width: 750,
            height: 388,
            size: 14.62,
            sizeInBytes: 14620,
            path: null,
            url: '/uploads/medium_strapi_cover_1fabc982ce_5b43615ed5.png',
          },
          small: {
            name: 'small_strapi-cover_1fabc982ce.png',
            hash: 'small_strapi_cover_1fabc982ce_5b43615ed5',
            ext: '.png',
            mime: 'image/png',
            width: 500,
            height: 258,
            size: 8.38,
            sizeInBytes: 8380,
            path: null,
            url: '/uploads/small_strapi_cover_1fabc982ce_5b43615ed5.png',
          },
        },
        hash: 'strapi_cover_1fabc982ce_5b43615ed5',
        ext: '.png',
        mime: 'image/png',
        size: 6.85,
        url: '/uploads/strapi_cover_1fabc982ce_5b43615ed5.png',
        previewUrl: null,
        provider: 'local',
        provider_metadata: null,
        createdAt: '2021-09-14T07:32:50.816Z',
        updatedAt: '2021-09-14T07:32:50.816Z',
        published_at: '2021-09-14T07:32:50.816Z',
        locale: null,
        isUrlSigned: false,
        folderPath: '/',
        rawFile: {
          size: 50,
          lastModified: 1631611919845,
          name: 'strapi-cover_1fabc982ce.png',
          type: 'image/png',
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(50)),
          slice: () => new Blob(),
          stream: () => new ReadableStream(),
          text: () => Promise.resolve('strapi-cover_1fabc982ce.png'),
        },
      },
      {
        id: 5,
        documentId: 'document5',
        name: 'mov_bbb.mp4',
        alternativeText: '',
        caption: '',
        width: null,
        height: null,
        formats: null,
        folder: null,
        type: 'videos',
        hash: 'mov_bbb_2f3907f7aa',
        ext: '.mp4',
        mime: 'video/mp4',
        size: 788.49,
        url: '/uploads/mov_bbb_2f3907f7aa.mp4',
        previewUrl: null,
        provider: 'local',
        provider_metadata: null,
        createdAt: '2021-09-14T07:48:30.882Z',
        updatedAt: '2021-09-14T07:48:30.882Z',
        published_at: '2021-09-14T07:48:30.882Z',
        locale: null,
        folderPath: '/',
        rawFile: {
          size: 50,
          lastModified: 1631611919845,
          name: 'mov_bbb.mp4',
          type: 'video/mp4',
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(50)),
          slice: () => new Blob(),
          stream: () => new ReadableStream(),
          text: () => Promise.resolve('mov_bbb.mp4'),
        },
      },
      {
        id: 6,
        documentId: 'document6',
        name: 'CARTE MARIAGE AVS - Printemps.pdf',
        alternativeText: '',
        caption: '',
        width: null,
        height: null,
        formats: null,
        folder: null,
        hash: 'CARTE_MARIAGE_AVS_Printemps_1f87b19e18',
        ext: '.pdf',
        mime: 'application/pdf',
        size: 422.37,
        url: '/uploads/CARTE_MARIAGE_AVS_Printemps_1f87b19e18.pdf',
        previewUrl: null,
        provider: 'local',
        provider_metadata: null,
        createdAt: '2021-09-14T07:51:59.845Z',
        updatedAt: '2021-09-14T07:51:59.845Z',
        locale: null,
        folderPath: '/',
        rawFile: {
          size: 50,
          lastModified: 1631611919845,
          name: 'CARTE MARIAGE AVS - Printemps.pdf',
          type: 'application/pdf',
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(50)),
          slice: () => new Blob(),
          stream: () => new ReadableStream(),
          text: () => Promise.resolve('CARTE MARIAGE AVS - Printemps.pdf'),
        },
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
                  onEditAsset={jest.fn()}
                  onClickAddAsset={jest.fn()}
                  onCancelUpload={jest.fn()}
                  onRemoveAsset={jest.fn()}
                  onUploadSucceed={jest.fn()}
                  folderId={null}
                  trackedLocation="upload"
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
