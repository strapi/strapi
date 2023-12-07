import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { render, screen } from '@tests/utils';

import { DraftAndPublishBadge } from '../DraftAndPublishBadge';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockReturnValue({
    hasDraftAndPublish: true,
    initialData: {
      publishedAt: '2021-08-10T14:00:00.000Z',
    },
  }),
}));

describe('DraftAndPublishBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should displayed published when the document has draft and published and it is published', () => {
    render(<DraftAndPublishBadge />);

    expect(screen.getByText('Editing')).toBeInTheDocument();
  });

  it('should show the draft design when it is not published', () => {
    // @ts-expect-error – mocking for testing
    jest.mocked(useCMEditViewDataManager).mockReturnValue({
      hasDraftAndPublish: true,
      initialData: {
        publishedAt: null,
      },
    });

    render(<DraftAndPublishBadge />);
  });

  it('should show return null when hasDraftAndPublish even if it has a publishedAt value', () => {
    // @ts-expect-error – mocking for testing
    jest.mocked(useCMEditViewDataManager).mockReturnValue({
      hasDraftAndPublish: false,
      initialData: {
        publishedAt: '2021-08-10T14:00:00.000Z',
      },
    });

    render(<DraftAndPublishBadge />);

    expect(screen.queryByText('Editing')).not.toBeInTheDocument();
  });
});
