import { render, screen } from '@tests/utils';

import { DiagnosticSnapshotModal } from '../DiagnosticSnapshotModal';

const trigger = jest.fn();

interface MockQueryState {
  data: unknown;
  isFetching: boolean;
  isError: boolean;
}

let mockQueryState: MockQueryState = {
  data: undefined,
  isFetching: true,
  isError: false,
};

jest.mock('../../../../../../services/admin', () => ({
  useLazyGetDebugDumpQuery: () => [trigger, mockQueryState],
}));

const setQueryState = (state: Partial<MockQueryState>) => {
  mockQueryState = { ...mockQueryState, ...state };
};

describe('DiagnosticSnapshotModal', () => {
  beforeEach(() => {
    trigger.mockClear();
    setQueryState({ data: undefined, isFetching: true, isError: false });
  });

  it('triggers the query on open and shows a spinner with disabled actions while fetching', async () => {
    render(<DiagnosticSnapshotModal isOpen onClose={jest.fn()} />);

    expect(trigger).toHaveBeenCalled();
    expect(await screen.findByText(/generating diagnostic snapshot/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /download/i })).toBeDisabled();
  });

  it('shows the description and payload once resolved, with enabled actions', async () => {
    setQueryState({ data: { dumpVersion: 1, strapi: { edition: 'CE' } }, isFetching: false });

    render(<DiagnosticSnapshotModal isOpen onClose={jest.fn()} />);

    expect(
      await screen.findByText(/this snapshot describes how your project is built/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/"dumpVersion": 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /download/i })).toBeEnabled();
  });

  it('notifies on successful copy', async () => {
    setQueryState({ data: { dumpVersion: 1 }, isFetching: false });

    const { user } = render(<DiagnosticSnapshotModal isOpen onClose={jest.fn()} />);

    const copyButton = await screen.findByRole('button', { name: /copy/i });
    await user.click(copyButton);

    expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument();
  });

  it('notifies when copying to the clipboard fails', async () => {
    setQueryState({ data: { dumpVersion: 1 }, isFetching: false });
    const writeTextSpy = jest
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValueOnce(new Error('denied'));

    const { user } = render(<DiagnosticSnapshotModal isOpen onClose={jest.fn()} />);

    const copyButton = await screen.findByRole('button', { name: /copy/i });
    await user.click(copyButton);

    expect(await screen.findByText(/could not copy/i)).toBeInTheDocument();

    writeTextSpy.mockRestore();
  });

  it('creates and revokes an object url when downloading', async () => {
    setQueryState({ data: { dumpVersion: 1 }, isFetching: false });
    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = jest.fn();
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { user } = render(<DiagnosticSnapshotModal isOpen onClose={jest.fn()} />);

    const downloadButton = await screen.findByRole('button', { name: /download/i });
    await user.click(downloadButton);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    clickSpy.mockRestore();
    createObjectURLSpy.mockRestore();
  });

  it('notifies and closes the modal when the query fails', async () => {
    setQueryState({ data: undefined, isFetching: false, isError: true });
    const onClose = jest.fn();

    render(<DiagnosticSnapshotModal isOpen onClose={onClose} />);

    expect(await screen.findByText(/failed to generate the debug dump/i)).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });
});
