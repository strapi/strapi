import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';

import en from '../../../translations/en.json';
import { DocAssetCard } from '../DocAssetCard';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: (x: string) => x,
}));

type Messages = typeof en;

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }: { id: keyof Messages }) => en[id]) }),
}));

describe('DocAssetCard', () => {
  it('renders the component with the correct infos', () => {
    const { getByText } = renderTL(
      <DesignSystemProvider>
        <DocAssetCard
          name="hello.png"
          extension="png"
          selected={false}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          size="S"
        />
      </DesignSystemProvider>
    );

    expect(getByText('hello.png')).toBeInTheDocument();
    expect(getByText('png')).toBeInTheDocument();
  });
});
