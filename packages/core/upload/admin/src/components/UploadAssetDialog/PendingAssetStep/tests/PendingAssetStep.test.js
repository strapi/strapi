import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { PendingAssetStep } from '../PendingAssetStep';
import en from '../../../../translations/en.json';

jest.mock('../../../../utils/getTrad', () => x => x);
jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

describe('PendingAssetStep', () => {
  it('snapshots the component with valid cards', () => {
    const assets = [
      {
        source: 'url',
        type: 'image',
        url: 'http://localhost:5000/CPAM.jpg',
        ext: 'jpg',
        mime: 'image/jpeg',
        alt: '',
        name: 'something.jpg',
      },
      {
        source: 'url',
        type: 'doc',
        url: 'http://localhost:5000/MARIAGE%20FRACHET%204.pdf',
        ext: 'pdf',
        mime: 'application/pdf',
        name: 'something.pdf',
      },
      {
        source: 'url',
        type: 'video',
        url: 'http://localhost:5000/mov_bbb.mp4',
        ext: 'mp4',
        mime: 'video/mp4',
        alt: '',
        name: 'something.mp4',
      },
    ];

    const { container } = renderTL(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={lightTheme}>
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
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
