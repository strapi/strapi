import { render, screen, waitFor } from '@strapi/admin/strapi-admin/test';

import { UploadProjectToChatProvider, useUploadProjectToChat } from '../UploadCodeModal';

const UNSAVED_MESSAGE =
  'You have unsaved changes. Are you sure you want to close? All your modifications will be lost.';

const mockProcessZipFile = jest.fn();

/**
 * The chat/upload plumbing is not under test, so it is stubbed at the module boundary.
 * The modal is driven through the real provider so open/close state is genuine.
 */
jest.mock('../hooks/useCodeUpload', () => ({
  useCodeUpload: () => ({
    processZipFile: mockProcessZipFile,
    processFolder: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

// The confirmation step builds a preview id with `crypto.randomUUID`, which jsdom lacks.
jest.mock('../lib/misc', () => ({
  ...jest.requireActual('../lib/misc'),
  generateId: () => 'test-id',
}));

jest.mock('../hooks/useAttachments', () => ({
  useAttachments: () => ({ addAttachments: jest.fn() }),
}));

jest.mock('../providers/ChatProvider', () => ({
  useStrapiChat: () => ({
    sendMessage: jest.fn(),
    openChat: jest.fn(),
    input: '',
    setInput: jest.fn(),
  }),
}));

const Opener = () => {
  const { openCodeUpload, isCodeUploadOpen } = useUploadProjectToChat();

  return (
    <>
      <button onClick={() => openCodeUpload()}>open</button>
      <span data-testid="state">{isCodeUploadOpen ? 'open' : 'closed'}</span>
    </>
  );
};

const setup = async () => {
  const utils = render(
    <UploadProjectToChatProvider>
      <Opener />
    </UploadProjectToChatProvider>
  );

  await utils.user.click(screen.getByRole('button', { name: 'open' }));
  await screen.findByRole('dialog');

  return utils;
};

describe('UploadCodeModal unsaved changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('closes on Escape without prompting when nothing is picked', async () => {
    const { user } = await setup();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('closed'));
    expect(screen.queryByText(UNSAVED_MESSAGE)).not.toBeInTheDocument();
  });

  it('asks for confirmation on Escape once a project is picked', async () => {
    const { user } = await setup();

    const [zipInput] = screen.getAllByLabelText('Upload project');
    await user.upload(zipInput, new File(['zip'], 'my-project.zip', { type: 'application/zip' }));

    expect(mockProcessZipFile).toHaveBeenCalled();

    await user.keyboard('{Escape}');

    expect(await screen.findByText(UNSAVED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByTestId('state')).toHaveTextContent('open');
  });
});
