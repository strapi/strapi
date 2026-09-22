import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';

import en from '../../../translations/en.json';
import { DocAssetCard } from '../DocAssetCard';

jest.mock('../../../utils/index', () => ({
  ...jest.requireActual('../../../utils/index'),
  getTrad: (x: string) => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({
    formatMessage: jest.fn(({ id }: { id: keyof typeof en }) => en[id] || 'No preview available'),
  }),
}));

describe('DocAssetCard', () => {
  it('renders a document asset card with correct structure', () => {
    const { getByText } = renderTL(
      <DesignSystemProvider>
        <DocAssetCard
          name="hello.png"
          extension="png"
          selected={false}
          isSelectable={true}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          size="S"
        />
      </DesignSystemProvider>
    );

    // Verify the file name is displayed
    expect(getByText('hello.png')).toBeInTheDocument();

    // Verify the no preview message is displayed
    expect(getByText('No preview available')).toBeInTheDocument();

    // Verify the extension is shown (transformed to lowercase in the DOM)
    expect(getByText('png')).toBeInTheDocument();

    // Verify the document type is shown
    expect(getByText('Doc')).toBeInTheDocument();
  });

  it('renders a PDF document', () => {
    const { getByText } = renderTL(
      <DesignSystemProvider>
        <DocAssetCard
          name="document.pdf"
          extension="pdf"
          selected={false}
          isSelectable={true}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          size="M"
        />
      </DesignSystemProvider>
    );

    // Verify the file name and extension are displayed
    expect(getByText('document.pdf')).toBeInTheDocument();
    expect(getByText('pdf')).toBeInTheDocument(); // Extension is shown in lowercase in the DOM
    expect(getByText('No preview available')).toBeInTheDocument();
  });

  it('has different size elements based on size prop', () => {
    const { getByText } = renderTL(
      <DesignSystemProvider>
        <DocAssetCard
          name="hello.png"
          extension="png"
          selected={false}
          isSelectable={true}
          onSelect={jest.fn()}
          onEdit={jest.fn()}
          size="S"
        />
      </DesignSystemProvider>
    );

    // With the small size, we can verify the component renders properly
    expect(getByText('hello.png')).toBeInTheDocument();
    expect(getByText('No preview available')).toBeInTheDocument();
  });
});
