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
    trigger.mockReset();
    // A request that has not settled yet
    trigger.mockReturnValue({ unwrap: () => new Promise(() => {}) });
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
    let downloadName = '';
    let wasInDocumentOnClick = false;
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloadName = this.download;
      wasInDocumentOnClick = document.body.contains(this);
    });
    // A plain wrapper rather than jest.spyOn: a mocked setTimeout makes Testing Library assume
    // fake timers. The 60s revoke is recorded instead of scheduled.
    const realSetTimeout = window.setTimeout;
    const deferred: Array<{ callback: () => void; delay?: number }> = [];
    window.setTimeout = ((callback: () => void, delay?: number, ...rest: unknown[]) => {
      if (delay === 60000) {
        deferred.push({ callback, delay });
        return 0;
      }
      return realSetTimeout(callback, delay, ...rest);
    }) as typeof window.setTimeout;

    const { user } = render(<DiagnosticSnapshotModal isOpen onClose={jest.fn()} />);

    const downloadButton = await screen.findByRole('button', { name: /download/i });
    await user.click(downloadButton);

    expect(createObjectURLSpy).toHaveBeenCalled();
    // Some browsers cancel a click on a detached anchor, or a download whose blob URL is revoked
    // in the same turn; the audit-log export avoids both, so this does too.
    expect(wasInDocumentOnClick).toBe(true);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    window.setTimeout = realSetTimeout;
    expect(deferred).toHaveLength(1);
    deferred[0].callback();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    // Every `:` in the ISO timestamp is replaced, since Windows rejects it in file names.
    expect(downloadName).toMatch(
      /^strapi-debug-dump-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z\.json$/
    );

    clickSpy.mockRestore();
    createObjectURLSpy.mockRestore();
  });

  it('notifies and closes the modal when the query fails', async () => {
    trigger.mockReturnValue({ unwrap: () => Promise.reject(new Error('500')) });
    setQueryState({ data: undefined, isFetching: false, isError: true });
    const onClose = jest.fn();

    render(<DiagnosticSnapshotModal isOpen onClose={onClose} />);

    expect(await screen.findByText(/failed to generate the debug dump/i)).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it('lets the next open succeed after a failed one', async () => {
    // The lazy query keeps `isError` from the failed request while the new one is in flight.
    // Judging failure from it closed the next open in the same commit.
    setQueryState({ data: undefined, isFetching: false, isError: true });
    const onClose = jest.fn();

    render(<DiagnosticSnapshotModal isOpen onClose={onClose} />);

    expect(trigger).toHaveBeenCalled();
    expect(await screen.findByText(/generating diagnostic snapshot/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
