import { unstable_useDocument } from '@strapi/content-manager/strapi-admin';
import { render, screen, waitFor } from '@tests/utils';
import { IntlProvider } from 'react-intl';

import { EntryValidationPopover } from '../EntryValidationPopover';

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocument: jest.fn(),
}));

const mockUseDocument = unstable_useDocument as jest.MockedFunction<typeof unstable_useDocument>;

describe('EntryValidationPopover', () => {
  const defaultProps = {
    action: 'publish' as const,
    schema: {
      kind: 'collectionType',
      uid: 'api::article.article',
      hasReviewWorkflow: true,
      stageRequiredToPublish: { id: 'stage1', name: 'Ready' },
    },
    entry: {
      documentId: '1',
      locale: 'en',
      strapi_stage: { id: 'stage1', name: 'Ready' },
    },
    status: 'draft' as const,
  };

  beforeEach(() => {
    mockUseDocument.mockReturnValue({
      validate: jest.fn(() => ({})),
      isLoading: false,
    } as any);
  });

  it('renders correctly for a valid entry', async () => {
    const { user } = render(
      <IntlProvider locale="en" messages={{}}>
        {/* @ts-expect-error - We only define schema props we are interested in */}
        <EntryValidationPopover {...defaultProps} />
      </IntlProvider>
    );

    expect(screen.getByText('Ready to publish')).toBeInTheDocument();

    // Open the popover
    await user.click(screen.getByRole('button', { name: 'Ready to publish' }));

    await waitFor(() => {
      expect(screen.getByText('Fields')).toBeInTheDocument();
    });
    expect(screen.getByText('All fields are filled correctly.')).toBeInTheDocument();
    expect(screen.getByText('Review stage')).toBeInTheDocument();
    expect(
      screen.getByText('This entry is at the required stage for publishing. (Ready)')
    ).toBeInTheDocument();
  });

  it('renders correctly for an invalid entry', async () => {
    mockUseDocument.mockReturnValue({
      validate: jest.fn(() => ({ title: 'Title is required' })),
      isLoading: false,
    } as any);

    const { user } = render(
      <IntlProvider locale="en" messages={{}}>
        {/* @ts-expect-error - We only define schema props we are interested in */}
        <EntryValidationPopover {...defaultProps} />
      </IntlProvider>
    );

    expect(screen.getByText('Not ready to publish')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Not ready to publish' }));

    await waitFor(() => {
      expect(screen.getByText('Fields')).toBeInTheDocument();
    });
    expect(screen.getByText('1 errors on fields.')).toBeInTheDocument();
    expect(screen.getByText('See errors')).toBeInTheDocument();
    expect(screen.getByText('Review stage')).toBeInTheDocument();
    expect(
      screen.getByText('This entry is at the required stage for publishing. (Ready)')
    ).toBeInTheDocument();
  });

  it('renders correctly for an entry not at the required stage', async () => {
    const props = {
      ...defaultProps,
      entry: {
        ...defaultProps.entry,
        strapi_stage: { id: 'stage2', name: 'Draft' },
      },
    };

    const { user } = render(
      <IntlProvider locale="en" messages={{}}>
        {/* @ts-expect-error - We only define schema props we are interested in */}
        <EntryValidationPopover {...props} />
      </IntlProvider>
    );

    expect(screen.getByText('Not ready to publish')).toBeInTheDocument();

    // Open the popover
    await user.click(screen.getByRole('button', { name: 'Not ready to publish' }));

    await waitFor(() => {
      expect(screen.getByText('Fields')).toBeInTheDocument();
    });
    expect(screen.getByText('All fields are filled correctly.')).toBeInTheDocument();
    expect(screen.getByText('Review stage')).toBeInTheDocument();
    expect(
      screen.getByText('This entry is not at the required stage for publishing. (Ready)')
    ).toBeInTheDocument();
  });
});
