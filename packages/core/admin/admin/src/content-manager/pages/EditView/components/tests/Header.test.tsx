import { render, screen } from '@tests/utils';

import { Header } from '../Header';

import ct from './data/ct-schema.json';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(() => ({
    initialData: {},
    isCreatingEntry: true,
    isSingleType: false,
    hasDraftAndPublish: false,
    layout: ct,
    modifiedData: {},
    onPublish: jest.fn(),
    onPublishPromptDismissal: jest.fn(),
    onUnpublish: jest.fn(),
    status: 'resolved',
    publishConfirmation: {
      show: false,
      draftCount: 0,
    },
  })),
}));

describe('CONTENT MANAGER | EditView | Header', () => {
  it('renders and matches the snapshot', () => {
    render(<Header allowedActions={{ canUpdate: true, canCreate: true, canPublish: true }} />);

    expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Create an entry' })).toBeInTheDocument();
    expect(screen.getByText('API ID: restaurant')).toBeInTheDocument();
  });
});
